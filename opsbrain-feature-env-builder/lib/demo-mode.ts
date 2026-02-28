import {
  buildBackendUrls,
  buildFrontendUrl,
  extractTicketDigits,
  TARGET_META,
  toBranchToken,
  toCanonicalTicket,
} from "@/lib/feature-env";
import type {
  BackendValidationResult,
  BranchRecord,
  EnsureBranchResponse,
  RepoTarget,
  WorkflowDispatchResponse,
  WorkflowJobSummary,
  WorkflowRunDetailsResponse,
  WorkflowRunSummary,
} from "@/lib/types";

type DemoRunRecord = {
  run: WorkflowRunSummary;
  jobs: WorkflowJobSummary[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const workflowPath = ".github/workflows/deploy-feature.yml";

const runCounters: Record<RepoTarget, number> = {
  admin: 1100,
  client: 2100,
};

const demoBranches: Record<RepoTarget, Map<string, BranchRecord>> = {
  admin: new Map<string, BranchRecord>(),
  client: new Map<string, BranchRecord>(),
};

const workflowRuns: Record<RepoTarget, Map<number, DemoRunRecord>> = {
  admin: new Map<number, DemoRunRecord>(),
  client: new Map<number, DemoRunRecord>(),
};

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function repoRunUrl(target: RepoTarget, runId: number) {
  return `https://github.com/${TARGET_META[target].repoSlug}/actions/runs/${runId}`;
}

function seededScenario(target: RepoTarget, ticketDigits: string) {
  const offset = target === "client" ? 1 : 0;
  return (Number(ticketDigits) + offset) % 3;
}

function seedBranches(target: RepoTarget, ticketDigits: string) {
  const branchToken = toBranchToken(ticketDigits);
  const scenario = seededScenario(target, ticketDigits);
  const seeded: BranchRecord[] = [];

  if (scenario === 2) {
    seeded.push({
      name: `deploy-${branchToken}`,
      sha: `${target.slice(0, 2)}9f3c1`,
      updatedAt: nowIso(-47 * 60_000),
      message:
        target === "admin"
          ? "Ship admin preview env safeguards for QA smoke checks"
          : "Ship client preview env landing flow fixes for QA smoke checks",
    });
  }

  if (scenario === 1) {
    seeded.push(
      {
        name: `deploy-${branchToken}`,
        sha: `${target.slice(0, 2)}d9b12`,
        updatedAt: nowIso(-21 * 60_000),
        message:
          target === "admin"
            ? "Wire admin preview environment header state into app shell"
            : "Wire client preview environment host mapping into runtime config",
      },
      {
        name: `feature/${branchToken}-${target}-qa-pass`,
        sha: `${target.slice(0, 2)}23ec8`,
        updatedAt: nowIso(-125 * 60_000),
        message:
          target === "admin"
            ? "Refine admin role matrix fixtures for BAM smoke checks"
            : "Refine client account onboarding copy for BAM smoke checks",
      },
      {
        name: `release/${branchToken}-${target}-staging-fix`,
        sha: `${target.slice(0, 2)}ac900`,
        updatedAt: nowIso(-26 * 60 * 60_000),
        message:
          target === "admin"
            ? "Resolve stale admin env host fallback for QA smoke tests"
            : "Resolve stale client env CDN fallback for QA smoke tests",
      },
    );
  }

  for (const branch of seeded) {
    demoBranches[target].set(branch.name, branch);
  }
}

function getSeededAndCreatedBranches(target: RepoTarget, ticketDigits: string) {
  seedBranches(target, ticketDigits);
  const token = toBranchToken(ticketDigits).toLowerCase();

  return [...demoBranches[target].values()]
    .filter((branch) => branch.name.toLowerCase().includes(token))
    .sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
}

export async function validateBackendDemo(
  input: string,
): Promise<BackendValidationResult> {
  const ticketDigits = extractTicketDigits(input);
  await sleep(1000);

  if (!ticketDigits) {
    throw new Error("Enter a BAM ticket number or a bamboo Swagger URL.");
  }

  if (ticketDigits.endsWith("00") || ticketDigits.endsWith("13")) {
    throw new Error(
      "The preview API did not respond. Double check the ticket number, or retry after the backend deploy completes.",
    );
  }

  const branchToken = toBranchToken(ticketDigits);
  const canonicalTicket = toCanonicalTicket(ticketDigits);
  const { backendHost, apiBaseUrl, healthUrl, swaggerUrl } =
    buildBackendUrls(ticketDigits);

  return {
    ok: true,
    ticketDigits,
    branchToken,
    canonicalTicket,
    backendHost,
    apiBaseUrl,
    healthUrl,
    swaggerUrl,
    status: 200,
    latencyMs: 118 + Number(ticketDigits.slice(-1)) * 9,
    checkedAt: nowIso(),
    validatedBy: "health",
  };
}

export async function fetchBranchesDemo(target: RepoTarget, ticketDigits: string) {
  await sleep(900);
  return getSeededAndCreatedBranches(target, ticketDigits);
}

export async function ensureBranchDemo({
  target,
  ticketDigits,
  baseBranch,
  branchName,
}: {
  target: RepoTarget;
  ticketDigits: string;
  baseBranch: string;
  branchName: string;
}): Promise<EnsureBranchResponse> {
  await sleep(700);

  const existing = demoBranches[target].get(branchName);
  if (existing) {
    return {
      created: false,
      branch: {
        name: existing.name,
        sha: existing.sha,
        baseBranch,
      },
    };
  }

  const createdBranch: BranchRecord = {
    name: branchName,
    sha: `${target}-${ticketDigits}`,
    updatedAt: nowIso(),
    message: `Created from ${baseBranch}`,
  };
  demoBranches[target].set(branchName, createdBranch);

  return {
    created: true,
    branch: {
      name: createdBranch.name,
      sha: createdBranch.sha,
      baseBranch,
    },
  };
}

export async function dispatchWorkflowDemo({
  target,
  ref,
  ticketDigits,
}: {
  target: RepoTarget;
  ref: string;
  ticketDigits: string;
}): Promise<WorkflowDispatchResponse> {
  await sleep(500);

  const runId = runCounters[target]++;
  const createdAt = nowIso();
  const run: WorkflowRunSummary = {
    id: runId,
    name: "Deploy Feature",
    status: "queued",
    conclusion: null,
    htmlUrl: repoRunUrl(target, runId),
    createdAt,
    updatedAt: createdAt,
    headBranch: ref,
    workflowId: 1,
    path: workflowPath,
    runNumber: runId,
  };

  const jobs: WorkflowJobSummary[] = [
    {
      id: runId * 10 + 1,
      name: "Build React App",
      status: "queued",
      conclusion: null,
      startedAt: null,
      completedAt: null,
      htmlUrl: run.htmlUrl,
    },
    {
      id: runId * 10 + 2,
      name: "Deploy Infra (CloudFormation)",
      status: "queued",
      conclusion: null,
      startedAt: null,
      completedAt: null,
      htmlUrl: run.htmlUrl,
    },
    {
      id: runId * 10 + 3,
      name: "Deploy Artifacts (S3 + CloudFront invalidation)",
      status: "queued",
      conclusion: null,
      startedAt: null,
      completedAt: null,
      htmlUrl: run.htmlUrl,
    },
  ];

  workflowRuns[target].set(runId, { run, jobs });
  scheduleDemoRun(target, runId, ticketDigits);
  console.info(`[demo:${target}] workflow dispatched for ${ref} (${ticketDigits})`);

  return {
    ok: true,
    target,
    dispatchedAt: createdAt,
  };
}

function scheduleDemoRun(target: RepoTarget, runId: number, ticketDigits: string) {
  const shouldFail = ticketDigits.endsWith("99");
  const jobDurations = [1500, 2000, 1800];
  let cumulative = 0;

  setTimeout(() => {
    const record = workflowRuns[target].get(runId);
    if (!record) {
      return;
    }

    record.run.status = "in_progress";
    record.run.updatedAt = nowIso();
    workflowRuns[target].set(runId, record);
  }, 600);

  jobDurations.forEach((duration, index) => {
    cumulative += duration;

    setTimeout(() => {
      const record = workflowRuns[target].get(runId);
      if (!record) {
        return;
      }

      const now = nowIso();
      record.run.status = "in_progress";
      record.run.updatedAt = now;

      record.jobs = record.jobs.map((job, jobIndex) => {
        if (jobIndex < index) {
          return {
            ...job,
            status: "completed",
            conclusion: "success",
            completedAt: job.completedAt ?? now,
          };
        }

        if (jobIndex === index) {
          return {
            ...job,
            status: "in_progress",
            startedAt: job.startedAt ?? now,
          };
        }

        return job;
      });

      workflowRuns[target].set(runId, record);
    }, cumulative - duration);

    setTimeout(() => {
      const record = workflowRuns[target].get(runId);
      if (!record) {
        return;
      }

      const now = nowIso();
      record.jobs = record.jobs.map((job, jobIndex) => {
        if (jobIndex === index) {
          const failedStage = shouldFail && index === record.jobs.length - 1;
          return {
            ...job,
            status: "completed",
            conclusion: failedStage ? "failure" : "success",
            startedAt: job.startedAt ?? now,
            completedAt: now,
          };
        }

        return job;
      });

      if (index === record.jobs.length - 1) {
        record.run.status = "completed";
        record.run.conclusion = shouldFail ? "failure" : "success";
      }

      record.run.updatedAt = now;
      workflowRuns[target].set(runId, record);
    }, cumulative);
  });
}

export async function getLatestWorkflowRunDemo({
  target,
  ref,
  createdAfter,
}: {
  target: RepoTarget;
  ref: string;
  createdAfter?: string | null;
}) {
  await sleep(350);

  const runs = [...workflowRuns[target].values()]
    .map((record) => record.run)
    .filter((run) => run.headBranch === ref)
    .filter((run) => {
      if (!createdAfter) {
        return true;
      }

      return (
        new Date(run.createdAt).getTime() >=
        new Date(createdAfter).getTime() - 5_000
      );
    })
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  return runs[0] ?? null;
}

export async function getWorkflowRunDetailsDemo(
  target: RepoTarget,
  runId: number,
): Promise<WorkflowRunDetailsResponse | null> {
  await sleep(250);
  const record = workflowRuns[target].get(runId);

  if (!record) {
    return null;
  }

  return {
    run: record.run,
    jobs: record.jobs,
  };
}

export function demoFrontendUrl(target: RepoTarget, ticketDigits: string) {
  return buildFrontendUrl(ticketDigits, target);
}
