import "server-only";

import { z } from "zod";

import type {
  GithubPublicConfig,
  RepoTarget,
  WorkflowJobSummary,
  WorkflowRunSummary,
} from "@/lib/types";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const DEFAULT_BASE_BRANCH = "develop";

const DEFAULT_TARGET_CONFIG: Record<
  RepoTarget,
  {
    owner: string;
    repo: string;
    workflowId: string;
  }
> = {
  admin: {
    owner: "bamboo-card",
    repo: "bamboo-admin-frontend",
    workflowId: "deploy-feature.yml",
  },
  client: {
    owner: "bamboo-card",
    repo: "bamboo_card_front",
    workflowId: "deploy-feature.yml",
  },
};

const retryableStatuses = new Set([429, 500, 502, 503, 504]);

const githubRunSchema = z.object({
  id: z.number(),
  name: z.string().catch("Deploy Feature"),
  status: z.string(),
  conclusion: z.string().nullable().catch(null),
  html_url: z.string().url(),
  created_at: z.string(),
  updated_at: z.string(),
  head_branch: z.string(),
  workflow_id: z.number().nullable().optional(),
  path: z.string().nullable().optional(),
  run_number: z.number().nullable().optional(),
});

const githubJobSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable().catch(null),
  started_at: z.string().nullable().catch(null),
  completed_at: z.string().nullable().catch(null),
  html_url: z.string().url(),
});

type GithubBranchApiItem = {
  name: string;
  commit: {
    sha: string;
  };
};

type GithubCommitApiResponse = {
  sha: string;
  commit: {
    message: string;
    committer: {
      date: string;
    } | null;
    author: {
      date: string;
    } | null;
  };
};

type GithubWorkflowRunsApiResponse = {
  workflow_runs: z.infer<typeof githubRunSchema>[];
};

type GithubJobsApiResponse = {
  jobs: z.infer<typeof githubJobSchema>[];
};

type RepoConfig = {
  owner: string;
  repo: string;
  workflowId: string;
};

type GithubConfig = {
  token: string;
  defaultBaseBranch: string;
  targets: Record<RepoTarget, RepoConfig>;
};

type AuthenticatedRepoConfig = RepoConfig & {
  target: RepoTarget;
  token: string;
  defaultBaseBranch: string;
};

export class GithubApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "GithubApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

function resolveRepoConfig(target: RepoTarget): RepoConfig {
  if (target === "admin") {
    return {
      owner:
        process.env.GITHUB_ADMIN_OWNER?.trim() ||
        process.env.GITHUB_OWNER?.trim() ||
        DEFAULT_TARGET_CONFIG.admin.owner,
      repo:
        process.env.GITHUB_ADMIN_REPO?.trim() ||
        process.env.GITHUB_REPO?.trim() ||
        DEFAULT_TARGET_CONFIG.admin.repo,
      workflowId:
        process.env.GITHUB_ADMIN_WORKFLOW_ID?.trim() ||
        process.env.GITHUB_WORKFLOW_ID?.trim() ||
        DEFAULT_TARGET_CONFIG.admin.workflowId,
    };
  }

  return {
    owner: process.env.GITHUB_CLIENT_OWNER?.trim() || DEFAULT_TARGET_CONFIG.client.owner,
    repo: process.env.GITHUB_CLIENT_REPO?.trim() || DEFAULT_TARGET_CONFIG.client.repo,
    workflowId:
      process.env.GITHUB_CLIENT_WORKFLOW_ID?.trim() || DEFAULT_TARGET_CONFIG.client.workflowId,
  };
}

export function getGithubConfig(): GithubConfig {
  return {
    token: process.env.GITHUB_TOKEN?.trim() || "",
    defaultBaseBranch:
      process.env.GITHUB_DEFAULT_BASE_BRANCH?.trim() || DEFAULT_BASE_BRANCH,
    targets: {
      admin: resolveRepoConfig("admin"),
      client: resolveRepoConfig("client"),
    },
  };
}

export function getRepoConfig(target: RepoTarget) {
  return getGithubConfig().targets[target];
}

export function getPublicGithubConfig(): GithubPublicConfig {
  const config = getGithubConfig();

  return {
    demoMode: isDemoMode(),
    defaultBaseBranch: config.defaultBaseBranch,
    tokenConfigured: Boolean(config.token),
    targets: {
      admin: config.targets.admin,
      client: config.targets.client,
    },
  };
}

export function ensureGithubAccess(target: RepoTarget): AuthenticatedRepoConfig {
  const config = getGithubConfig();

  if (!config.token) {
    throw new GithubApiError(
      "Missing GITHUB_TOKEN. Set it in your server environment before using real GitHub mode.",
      500,
      "GITHUB_TOKEN_MISSING",
    );
  }

  return {
    target,
    token: config.token,
    defaultBaseBranch: config.defaultBaseBranch,
    ...config.targets[target],
  };
}

function normalizeResponseBody(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractGithubMessage(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  if ("message" in body && typeof body.message === "string") {
    return body.message;
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubRequest<T>(
  config: AuthenticatedRepoConfig,
  path: string,
  init: RequestInit = {},
  options: {
    retries?: number;
    expectedStatus?: number | number[];
  } = {},
) {
  const expected = Array.isArray(options.expectedStatus)
    ? options.expectedStatus
    : [options.expectedStatus ?? 200];
  const retries = options.retries ?? 2;

  const requestHeaders = new Headers(init.headers);
  requestHeaders.set("Accept", "application/vnd.github+json");
  requestHeaders.set("Authorization", `Bearer ${config.token}`);
  requestHeaders.set("X-GitHub-Api-Version", GITHUB_API_VERSION);
  requestHeaders.set("User-Agent", "bamboo-feature-builder");

  const url = `${GITHUB_API_BASE}${path}`;
  console.info(
    `[github:${config.target}] ${init.method ?? "GET"} ${config.owner}/${config.repo}${path}`,
  );

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: requestHeaders,
        cache: "no-store",
      });

      const bodyText = await response.text();
      const body = normalizeResponseBody(bodyText);
      const expectedStatus = expected.includes(response.status);

      if (response.ok && expectedStatus) {
        return body as T;
      }

      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      const rateLimitReset = response.headers.get("x-ratelimit-reset");

      if ((response.status === 403 || response.status === 429) && rateLimitRemaining === "0") {
        const resetAt = rateLimitReset
          ? new Date(Number(rateLimitReset) * 1000).toISOString()
          : "unknown";
        throw new GithubApiError(
          `GitHub API rate limit reached for ${config.owner}/${config.repo}. Try again after ${resetAt}.`,
          response.status,
          "GITHUB_RATE_LIMITED",
          body,
        );
      }

      if (retryableStatuses.has(response.status) && attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      throw new GithubApiError(
        extractGithubMessage(body) ??
          `GitHub request failed with status ${response.status}.`,
        response.status,
        "GITHUB_REQUEST_FAILED",
        body,
      );
    } catch (error) {
      if (error instanceof GithubApiError) {
        throw error;
      }

      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      throw new GithubApiError(
        error instanceof Error ? error.message : "Unknown GitHub request error.",
        502,
        "GITHUB_NETWORK_ERROR",
      );
    }
  }

  throw new GithubApiError("GitHub request failed unexpectedly.", 500, "GITHUB_UNKNOWN_ERROR");
}

// GitHub REST: GET /repos/{owner}/{repo}/branches
export async function listRepoBranches(target: RepoTarget) {
  const config = ensureGithubAccess(target);
  const branches: GithubBranchApiItem[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const batch = await githubRequest<GithubBranchApiItem[]>(
      config,
      `/repos/${config.owner}/${config.repo}/branches?per_page=100&page=${page}`,
      { method: "GET" },
      { expectedStatus: 200 },
    );

    branches.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  return branches;
}

export async function getBranch(target: RepoTarget, branchName: string) {
  const config = ensureGithubAccess(target);

  return githubRequest<GithubBranchApiItem>(
    config,
    `/repos/${config.owner}/${config.repo}/branches/${encodeURIComponent(branchName)}`,
    { method: "GET" },
    { expectedStatus: 200 },
  );
}

export async function getCommit(target: RepoTarget, sha: string) {
  const config = ensureGithubAccess(target);

  return githubRequest<GithubCommitApiResponse>(
    config,
    `/repos/${config.owner}/${config.repo}/commits/${sha}`,
    { method: "GET" },
    { expectedStatus: 200 },
  );
}

// GitHub REST: POST /repos/{owner}/{repo}/git/refs
export async function createBranchRef(
  target: RepoTarget,
  branchName: string,
  sha: string,
) {
  const config = ensureGithubAccess(target);

  return githubRequest<{ ref: string; object: { sha: string } }>(
    config,
    `/repos/${config.owner}/${config.repo}/git/refs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    },
    { expectedStatus: 201 },
  );
}

// GitHub REST: POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
export async function dispatchWorkflow(target: RepoTarget, ref: string) {
  const config = ensureGithubAccess(target);

  await githubRequest<null>(
    config,
    `/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowId}/dispatches`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref,
        inputs: {},
      }),
    },
    { expectedStatus: 204 },
  );
}

// GitHub REST: GET /repos/{owner}/{repo}/actions/runs
export async function listWorkflowRunsForBranch(target: RepoTarget, branch: string) {
  const config = ensureGithubAccess(target);

  const response = await githubRequest<GithubWorkflowRunsApiResponse>(
    config,
    `/repos/${config.owner}/${config.repo}/actions/runs?branch=${encodeURIComponent(
      branch,
    )}&per_page=10`,
    { method: "GET" },
    { expectedStatus: 200 },
  );

  return response.workflow_runs.map(normalizeWorkflowRun);
}

export async function getWorkflowRun(target: RepoTarget, runId: number) {
  const config = ensureGithubAccess(target);

  const run = await githubRequest<z.infer<typeof githubRunSchema>>(
    config,
    `/repos/${config.owner}/${config.repo}/actions/runs/${runId}`,
    { method: "GET" },
    { expectedStatus: 200 },
  );

  return normalizeWorkflowRun(run);
}

export async function listJobsForRun(target: RepoTarget, runId: number) {
  const config = ensureGithubAccess(target);

  const response = await githubRequest<GithubJobsApiResponse>(
    config,
    `/repos/${config.owner}/${config.repo}/actions/runs/${runId}/jobs?per_page=100`,
    { method: "GET" },
    { expectedStatus: 200 },
  );

  return response.jobs.map(normalizeWorkflowJob);
}

export function workflowMatchesConfig(target: RepoTarget, run: WorkflowRunSummary) {
  const { workflowId } = getRepoConfig(target);
  return run.path?.includes(workflowId) ?? false;
}

export function normalizeWorkflowRun(
  run: z.infer<typeof githubRunSchema>,
): WorkflowRunSummary {
  return {
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    headBranch: run.head_branch,
    workflowId: run.workflow_id ?? null,
    path: run.path ?? null,
    runNumber: run.run_number ?? null,
  };
}

export function normalizeWorkflowJob(
  job: z.infer<typeof githubJobSchema>,
): WorkflowJobSummary {
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    htmlUrl: job.html_url,
  };
}
