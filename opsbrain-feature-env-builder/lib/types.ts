export type RepoTarget = "admin" | "client";

export type ApiErrorPayload = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type GithubRepoPublicConfig = {
  owner: string;
  repo: string;
  workflowId: string;
};

export type GithubPublicConfig = {
  demoMode: boolean;
  defaultBaseBranch: string;
  tokenConfigured: boolean;
  targets: Record<RepoTarget, GithubRepoPublicConfig>;
};

export type BackendValidationResult = {
  ok: boolean;
  ticketDigits: string;
  branchToken: string;
  canonicalTicket: string;
  backendHost: string;
  apiBaseUrl: string;
  healthUrl: string;
  swaggerUrl: string;
  status: number;
  latencyMs: number;
  checkedAt: string;
  validatedBy: "health" | "swagger";
};

export type BranchRecord = {
  name: string;
  sha: string;
  updatedAt: string;
  message: string;
};

export type BranchesResponse = {
  branches: BranchRecord[];
};

export type EnsureBranchResponse = {
  created: boolean;
  branch: {
    name: string;
    sha: string;
    baseBranch: string;
  };
};

export type WorkflowDispatchResponse = {
  ok: true;
  target: RepoTarget;
  dispatchedAt: string;
};

export type WorkflowRunSummary = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  headBranch: string;
  workflowId: number | null;
  path: string | null;
  runNumber: number | null;
};

export type WorkflowJobSummary = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  htmlUrl: string;
};

export type WorkflowLatestRunResponse = {
  run: WorkflowRunSummary;
};

export type WorkflowRunDetailsResponse = {
  run: WorkflowRunSummary;
  jobs: WorkflowJobSummary[];
};

export type DeploymentStageStatus = "pending" | "running" | "complete" | "failed";

export type DeploymentStage = {
  key: string;
  label: string;
  status: DeploymentStageStatus;
  details: string[];
  startedAt?: string;
  completedAt?: string;
};

export type DeploymentRunStatus = "queued" | "running" | "success" | "failed";

export type DeploymentRun = {
  target: RepoTarget;
  id: string;
  runId: number;
  branch: string;
  branchToken: string;
  ticketDigits: string;
  canonicalTicket: string;
  apiBaseUrl: string;
  healthUrl: string;
  swaggerUrl: string;
  frontendUrl: string;
  status: DeploymentRunStatus;
  conclusion: string | null;
  progress: number;
  currentStageLabel: string;
  createdAt: string;
  updatedAt: string;
  logUrl: string;
  workflowName: string;
  stages: DeploymentStage[];
};

export type RunSeed = {
  target: RepoTarget;
  runId: number;
  branch: string;
  branchToken: string;
  ticketDigits: string;
  canonicalTicket: string;
  apiBaseUrl: string;
  healthUrl: string;
  swaggerUrl: string;
  frontendUrl: string;
  trackedAt: string;
  updatedAt: string;
  status?: DeploymentRunStatus;
  conclusion?: string | null;
  logUrl?: string;
  workflowName?: string;
};

export type FrontendTargetState = {
  enabled: boolean;
  ticketDigits: string;
  selectedBranch: BranchRecord | null;
  createdBranch: BranchRecord | null;
  currentRun: DeploymentRun | null;
};
