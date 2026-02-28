"use client";

import {
  buildFrontendUrl,
  TARGET_META,
  toBranchToken,
  toCanonicalTicket,
} from "@/lib/feature-env";
import { RUN_HISTORY_STORAGE_KEY } from "@/lib/local-auth";
import type {
  BackendValidationResult,
  BranchRecord,
  BranchesResponse,
  DeploymentRun,
  DeploymentRunStatus,
  DeploymentStage,
  EnsureBranchResponse,
  GithubPublicConfig,
  RepoTarget,
  RunSeed,
  WorkflowDispatchResponse,
  WorkflowJobSummary,
  WorkflowLatestRunResponse,
  WorkflowRunDetailsResponse,
  WorkflowRunSummary,
} from "@/lib/types";

class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function requestJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | {
        ok: false;
        error?: {
          code?: string;
          message?: string;
          details?: unknown;
        };
      }
    | null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error?.message
        ? payload.error.message
        : `Request failed with status ${response.status}`;
    const code =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error?.code
        ? payload.error.code
        : "REQUEST_FAILED";

    throw new ApiClientError(message, response.status, code, payload);
  }

  return payload as T;
}

function readRunSeeds() {
  if (typeof window === "undefined") {
    return [] as RunSeed[];
  }

  const raw = window.localStorage.getItem(RUN_HISTORY_STORAGE_KEY);
  if (!raw) {
    return [] as RunSeed[];
  }

  try {
    return JSON.parse(raw) as RunSeed[];
  } catch {
    return [] as RunSeed[];
  }
}

function writeRunSeeds(seeds: RunSeed[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RUN_HISTORY_STORAGE_KEY, JSON.stringify(seeds.slice(0, 24)));
}

function seedKey(seed: RunSeed) {
  return `${seed.target}:${seed.runId}`;
}

function upsertRunSeed(seed: RunSeed) {
  const seeds = readRunSeeds();
  const next = [seed, ...seeds.filter((entry) => seedKey(entry) !== seedKey(seed))].sort(
    (left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    },
  );
  writeRunSeeds(next);
}

function mapJobStatus(job: WorkflowJobSummary): DeploymentStage["status"] {
  if (job.status === "completed") {
    return job.conclusion === "success" ? "complete" : "failed";
  }

  if (job.status === "in_progress") {
    return "running";
  }

  return "pending";
}

function mapRunStatus(run: WorkflowRunSummary): DeploymentRunStatus {
  if (run.status === "completed") {
    return run.conclusion === "success" ? "success" : "failed";
  }

  if (run.status === "queued" || run.status === "requested" || run.status === "waiting") {
    return "queued";
  }

  return "running";
}

function normalizeJobLabel(jobName: string) {
  if (/build/i.test(jobName)) {
    return "Build React App";
  }

  if (/infra|cloudformation/i.test(jobName)) {
    return "Deploy Infra (CloudFormation)";
  }

  if (/artifact|s3|cloudfront/i.test(jobName)) {
    return "Deploy Artifacts (S3 + CloudFront invalidation)";
  }

  return jobName;
}

function buildStages(run: WorkflowRunSummary, jobs: WorkflowJobSummary[]): DeploymentStage[] {
  const queueingStatus: DeploymentStage["status"] =
    run.status === "queued"
      ? "running"
      : run.status === "completed" || run.status === "in_progress"
        ? "complete"
        : "pending";

  const stages: DeploymentStage[] = [
    {
      key: "queueing",
      label: "Queueing",
      status: queueingStatus,
      details: [
        "Workflow dispatch accepted by GitHub Actions.",
        "Waiting for the runner and deployment jobs to start.",
      ],
      startedAt: run.createdAt,
      completedAt: queueingStatus === "complete" ? run.updatedAt : undefined,
    },
  ];

  const orderedJobs = [...jobs].sort((left, right) => {
    const leftTime = new Date(left.startedAt ?? left.completedAt ?? run.createdAt).getTime();
    const rightTime = new Date(right.startedAt ?? right.completedAt ?? run.createdAt).getTime();
    return leftTime - rightTime;
  });

  for (const job of orderedJobs) {
    const status = mapJobStatus(job);
    stages.push({
      key: `job-${job.id}`,
      label: normalizeJobLabel(job.name),
      status,
      details: [
        `GitHub job status: ${job.status}.`,
        job.conclusion
          ? `Conclusion: ${job.conclusion}.`
          : "GitHub has not published a conclusion yet.",
      ],
      startedAt: job.startedAt ?? undefined,
      completedAt: job.completedAt ?? undefined,
    });
  }

  stages.push({
    key: "done",
    label:
      run.conclusion === "success"
        ? "Done"
        : run.status === "completed"
          ? "Completed"
          : "Done",
    status:
      run.status !== "completed"
        ? "pending"
        : run.conclusion === "success"
          ? "complete"
          : "failed",
    details: [
      run.conclusion === "success"
        ? "Preview deployment completed successfully."
        : run.status === "completed"
          ? `Workflow completed with conclusion: ${run.conclusion ?? "unknown"}.`
          : "The final completion signal is still pending from GitHub.",
    ],
    startedAt: run.createdAt,
    completedAt: run.status === "completed" ? run.updatedAt : undefined,
  });

  return stages;
}

function calculateProgress(stages: DeploymentStage[]) {
  const total = stages.length;
  const completeUnits = stages.reduce((count, stage) => {
    if (stage.status === "complete" || stage.status === "failed") {
      return count + 1;
    }

    if (stage.status === "running") {
      return count + 0.5;
    }

    return count;
  }, 0);

  return Math.max(4, Math.min(100, Math.round((completeUnits / total) * 100)));
}

function toRunSeed(run: DeploymentRun, previous?: RunSeed): RunSeed {
  return {
    target: run.target,
    runId: run.runId,
    branch: run.branch,
    branchToken: run.branchToken,
    ticketDigits: run.ticketDigits,
    canonicalTicket: run.canonicalTicket,
    apiBaseUrl: run.apiBaseUrl,
    healthUrl: run.healthUrl,
    swaggerUrl: run.swaggerUrl,
    frontendUrl: run.frontendUrl,
    trackedAt: previous?.trackedAt ?? run.createdAt,
    updatedAt: run.updatedAt,
    status: run.status,
    conclusion: run.conclusion,
    logUrl: run.logUrl,
    workflowName: run.workflowName,
  };
}

type RunContext = {
  target: RepoTarget;
  branch: string;
  branchToken: string;
  ticketDigits: string;
  canonicalTicket: string;
  apiBaseUrl: string;
  healthUrl: string;
  swaggerUrl: string;
  frontendUrl: string;
  trackedAt?: string;
};

function mapToDeploymentRun(
  payload: WorkflowRunDetailsResponse,
  fallback: RunContext,
): DeploymentRun {
  const stages = buildStages(payload.run, payload.jobs);
  const status = mapRunStatus(payload.run);
  const progress = calculateProgress(stages);
  const currentStageLabel =
    status === "success"
      ? "Environment ready"
      : status === "failed"
        ? "Workflow failed"
        : stages.find((stage) => stage.status === "running")?.label ?? "Queueing";

  const deploymentRun: DeploymentRun = {
    target: fallback.target,
    id: String(payload.run.id),
    runId: payload.run.id,
    branch: fallback.branch,
    branchToken: fallback.branchToken,
    ticketDigits: fallback.ticketDigits,
    canonicalTicket: fallback.canonicalTicket,
    apiBaseUrl: fallback.apiBaseUrl,
    healthUrl: fallback.healthUrl,
    swaggerUrl: fallback.swaggerUrl,
    frontendUrl: fallback.frontendUrl,
    status,
    conclusion: payload.run.conclusion,
    progress,
    currentStageLabel,
    createdAt: payload.run.createdAt,
    updatedAt: payload.run.updatedAt,
    logUrl: payload.run.htmlUrl,
    workflowName: payload.run.name,
    stages,
  };

  const previous = readRunSeeds().find(
    (seed) => seed.target === fallback.target && seed.runId === payload.run.id,
  );
  upsertRunSeed(toRunSeed(deploymentRun, previous));

  return deploymentRun;
}

function fallbackRunFromSeed(seed: RunSeed): DeploymentRun {
  return {
    target: seed.target,
    id: String(seed.runId),
    runId: seed.runId,
    branch: seed.branch,
    branchToken: seed.branchToken,
    ticketDigits: seed.ticketDigits,
    canonicalTicket: seed.canonicalTicket,
    apiBaseUrl: seed.apiBaseUrl,
    healthUrl: seed.healthUrl,
    swaggerUrl: seed.swaggerUrl,
    frontendUrl: seed.frontendUrl,
    status: seed.status ?? "queued",
    conclusion: seed.conclusion ?? null,
    progress:
      seed.status === "success"
        ? 100
        : seed.status === "failed"
          ? 100
          : seed.status === "running"
            ? 64
            : 8,
    currentStageLabel:
      seed.status === "success" ? "Environment ready" : "Waiting for GitHub",
    createdAt: seed.trackedAt,
    updatedAt: seed.updatedAt,
    logUrl:
      seed.logUrl ??
      `https://github.com/${TARGET_META[seed.target].repoSlug}/actions/runs/${seed.runId}`,
    workflowName: seed.workflowName ?? "Deploy Feature",
    stages: [
      {
        key: "queueing",
        label: "Queueing",
        status: seed.status === "queued" ? "running" : "complete",
        details: ["Waiting for the latest workflow state from GitHub."],
        startedAt: seed.trackedAt,
      },
    ],
  };
}

export async function validateBackend(input: string) {
  return requestJson<BackendValidationResult>("/api/backend/parse-and-validate", {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

export async function fetchBranches(target: RepoTarget, ticketDigits: string) {
  const response = await requestJson<BranchesResponse>(
    `/api/github/branches?target=${encodeURIComponent(target)}&ticketDigits=${encodeURIComponent(
      ticketDigits,
    )}`,
  );

  return response.branches;
}

export async function createBranch({
  target,
  base,
  name,
  ticketDigits,
}: {
  target: RepoTarget;
  base: string;
  name: string;
  ticketDigits: string;
}) {
  const response = await requestJson<EnsureBranchResponse>(
    "/api/github/branches/ensure",
    {
      method: "POST",
      body: JSON.stringify({
        target,
        ticketDigits,
        baseBranch: base,
        branchName: name,
      }),
    },
  );

  return {
    name: response.branch.name,
    sha: response.branch.sha,
    updatedAt: new Date().toISOString(),
    message: response.created
      ? `Created from ${response.branch.baseBranch}`
      : `Already exists on ${response.branch.baseBranch}`,
  } satisfies BranchRecord;
}

export async function deployFeatureEnv({
  target,
  ref,
  ticketDigits,
}: {
  target: RepoTarget;
  ref: string;
  ticketDigits: string;
}) {
  return requestJson<WorkflowDispatchResponse>("/api/github/workflows/deploy-feature", {
    method: "POST",
    body: JSON.stringify({
      target,
      ref,
      ticketDigits,
    }),
  });
}

export async function getLatestRunForRef({
  target,
  ref,
  createdAfter,
  ticketDigits,
  apiBaseUrl,
  healthUrl,
  swaggerUrl,
}: {
  target: RepoTarget;
  ref: string;
  createdAfter?: string;
  ticketDigits: string;
  apiBaseUrl: string;
  healthUrl: string;
  swaggerUrl: string;
}) {
  const branchToken = toBranchToken(ticketDigits);
  const canonicalTicket = toCanonicalTicket(ticketDigits);
  const frontendUrl = buildFrontendUrl(ticketDigits, target);

  try {
    const response = await requestJson<WorkflowLatestRunResponse>(
      `/api/github/runs/latest?target=${encodeURIComponent(target)}&ref=${encodeURIComponent(
        ref,
      )}${createdAfter ? `&createdAfter=${encodeURIComponent(createdAfter)}` : ""}`,
    );

    const details = await requestJson<WorkflowRunDetailsResponse>(
      `/api/github/runs/${response.run.id}?target=${encodeURIComponent(target)}`,
    );

    return mapToDeploymentRun(details, {
      target,
      branch: ref,
      branchToken,
      ticketDigits,
      canonicalTicket,
      apiBaseUrl,
      healthUrl,
      swaggerUrl,
      frontendUrl,
    });
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      error.status === 404 &&
      error.code === "RUN_NOT_FOUND"
    ) {
      return null;
    }

    throw error;
  }
}

export async function getRunStatus(
  target: RepoTarget,
  runId: string,
  fallback?: RunSeed,
) {
  try {
    const details = await requestJson<WorkflowRunDetailsResponse>(
      `/api/github/runs/${runId}?target=${encodeURIComponent(target)}`,
    );

    const seed =
      fallback ??
      readRunSeeds().find(
        (entry) => entry.target === target && entry.runId === Number(runId),
      );

    if (!seed) {
      return null;
    }

    return mapToDeploymentRun(details, {
      target,
      branch: seed.branch,
      branchToken: seed.branchToken,
      ticketDigits: seed.ticketDigits,
      canonicalTicket: seed.canonicalTicket,
      apiBaseUrl: seed.apiBaseUrl,
      healthUrl: seed.healthUrl,
      swaggerUrl: seed.swaggerUrl,
      frontendUrl: seed.frontendUrl,
      trackedAt: seed.trackedAt,
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404 && fallback) {
      return fallbackRunFromSeed(fallback);
    }

    throw error;
  }
}

export async function listRecentRuns() {
  const seeds = readRunSeeds()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 12);

  if (!seeds.length) {
    return [] as DeploymentRun[];
  }

  const runs = await Promise.all(
    seeds.map(async (seed) => {
      try {
        return await getRunStatus(seed.target, String(seed.runId), seed);
      } catch {
        return fallbackRunFromSeed(seed);
      }
    }),
  );

  return runs.filter((run): run is DeploymentRun => Boolean(run));
}

export async function getGithubPublicConfig() {
  return requestJson<GithubPublicConfig>("/api/github/config");
}
