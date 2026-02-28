"use client";

import {
  type Query,
  useMutation,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Layers3,
  Loader2,
  Rocket,
  Sparkles,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BackendValidatorCard } from "@/components/feature-env/backend-validator-card";
import { DeployTimeline } from "@/components/feature-env/deploy-timeline";
import { FrontendTargetsStep } from "@/components/feature-env/frontend-targets-step";
import { RunSummaryCard } from "@/components/feature-env/run-summary-card";
import { WizardStepper } from "@/components/feature-env/wizard-stepper";
import { CopyButton } from "@/components/shared/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildFrontendUrl,
  extractTicketDigits,
  REPO_TARGETS,
  TARGET_META,
  toBranchToken,
} from "@/lib/feature-env";
import { deployFeatureEnv, getLatestRunForRef, getRunStatus } from "@/lib/mockApi";
import type {
  BackendValidationResult,
  DeploymentRun,
  FrontendTargetState,
  RepoTarget,
  RunSeed,
} from "@/lib/types";
import { useWizardStore } from "@/lib/wizard-store";

type PendingLookup = {
  ref: string;
  createdAfter: string;
  ticketDigits: string;
  apiBaseUrl: string;
  healthUrl: string;
  swaggerUrl: string;
};

type PendingLookupState = Record<RepoTarget, PendingLookup | null>;
type TargetErrorState = Partial<Record<RepoTarget, string>>;

const EMPTY_PENDING_LOOKUPS: PendingLookupState = {
  admin: null,
  client: null,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function toRunSeed(run: DeploymentRun): RunSeed {
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
    trackedAt: run.createdAt,
    updatedAt: run.updatedAt,
    status: run.status,
    conclusion: run.conclusion,
    logUrl: run.logUrl,
    workflowName: run.workflowName,
  };
}

export function FeatureEnvBuilder() {
  const activeStep = useWizardStore((state) => state.activeStep);
  const validation = useWizardStore((state) => state.validation);
  const targets = useWizardStore((state) => state.targets);
  const commandCount = useWizardStore((state) => state.commandCounters.deploy);
  const setActiveStep = useWizardStore((state) => state.setActiveStep);
  const setCurrentRun = useWizardStore((state) => state.setCurrentRun);
  const reset = useWizardStore((state) => state.reset);
  const queryClient = useQueryClient();
  const commandRef = useRef(commandCount);
  const [pendingLookups, setPendingLookups] =
    useState<PendingLookupState>(EMPTY_PENDING_LOOKUPS);
  const [dispatchErrors, setDispatchErrors] = useState<TargetErrorState>({});
  const [dispatchingTargets, setDispatchingTargets] = useState<RepoTarget[]>([]);

  const selectedTargets = REPO_TARGETS.filter((target) => targets[target].enabled);
  const readyTargets = selectedTargets.filter((target) => {
    return (
      Boolean(validation) &&
      Boolean(extractTicketDigits(targets[target].ticketDigits)) &&
      Boolean(targets[target].selectedBranch)
    );
  });
  const activeRuns = selectedTargets.filter((target) => targets[target].currentRun);
  const successfulTargets = selectedTargets.filter(
    (target) => targets[target].currentRun?.status === "success",
  );
  const deployMutation = useMutation({
    mutationFn: async (requestedTargets: RepoTarget[]) => {
      if (!validation) {
        throw new Error("Validate the backend before dispatching workflows.");
      }

      return Promise.allSettled(
        requestedTargets.map(async (target) => {
          const parsedTicketDigits = extractTicketDigits(targets[target].ticketDigits);
          const selectedBranch = targets[target].selectedBranch;

          if (!parsedTicketDigits || !selectedBranch) {
            throw new Error(
              `${TARGET_META[target].label} needs valid BAM digits and a selected branch.`,
            );
          }

          const dispatch = await deployFeatureEnv({
            target,
            ref: selectedBranch.name,
            ticketDigits: parsedTicketDigits,
          });

          return {
            target,
            ref: selectedBranch.name,
            ticketDigits: parsedTicketDigits,
            dispatchedAt: dispatch.dispatchedAt,
          };
        }),
      );
    },
    onMutate: (requestedTargets) => {
      setDispatchingTargets(requestedTargets);
      requestedTargets.forEach((target) => {
        setCurrentRun(target, null);
      });
      setDispatchErrors((current) => {
        const next = { ...current };
        for (const target of requestedTargets) {
          delete next[target];
        }
        return next;
      });
    },
    onSuccess: (results, requestedTargets) => {
      if (!validation) {
        return;
      }

      const successTargets: RepoTarget[] = [];
      const nextErrors: TargetErrorState = {};

      setPendingLookups((current) => {
        const next = { ...current };

        results.forEach((result, index) => {
          const fallbackTarget = requestedTargets[index];

          if (result.status === "fulfilled") {
            const payload = result.value;
            successTargets.push(payload.target);
            next[payload.target] = {
              ref: payload.ref,
              createdAfter: payload.dispatchedAt,
              ticketDigits: payload.ticketDigits,
              apiBaseUrl: validation.apiBaseUrl,
              healthUrl: validation.healthUrl,
              swaggerUrl: validation.swaggerUrl,
            };
          } else if (fallbackTarget) {
            nextErrors[fallbackTarget] =
              result.reason instanceof Error
                ? result.reason.message
                : "Unable to dispatch workflow.";
          }
        });

        return next;
      });

      setDispatchErrors((current) => ({
        ...current,
        ...nextErrors,
      }));
      queryClient.invalidateQueries({ queryKey: ["recent-runs"] });

      if (successTargets.length && Object.keys(nextErrors).length) {
        toast.warning("Some targets dispatched successfully, but at least one failed to start.");
      } else if (successTargets.length) {
        toast.success(
          successTargets.length === 1
            ? `${TARGET_META[successTargets[0]].label} workflow dispatched`
            : "All selected workflows dispatched",
        );
      } else {
        toast.error("No workflow dispatches were accepted.");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to deploy.");
    },
    onSettled: () => {
      setDispatchingTargets([]);
    },
  });

  const latestRunQueries = useQueries({
    queries: REPO_TARGETS.map((target) => {
      const pendingLookup = pendingLookups[target];
      const currentRun = targets[target].currentRun;

      return {
        queryKey: ["latest-run", target, pendingLookup?.ref, pendingLookup?.createdAfter],
        queryFn: () => {
          if (!pendingLookup) {
            return null;
          }

          return getLatestRunForRef({
            target,
            ref: pendingLookup.ref,
            createdAfter: pendingLookup.createdAfter,
            ticketDigits: pendingLookup.ticketDigits,
            apiBaseUrl: pendingLookup.apiBaseUrl,
            healthUrl: pendingLookup.healthUrl,
            swaggerUrl: pendingLookup.swaggerUrl,
          });
        },
        enabled: Boolean(targets[target].enabled && pendingLookup && !currentRun),
        retry: false,
        refetchInterval: (
          query: Query<DeploymentRun | null, Error, DeploymentRun | null, readonly unknown[]>,
        ) => (query.state.data ? false : 5_000),
      };
    }),
  });

  const runQueries = useQueries({
    queries: REPO_TARGETS.map((target) => {
      const currentRun = targets[target].currentRun;

      return {
        queryKey: ["run-status", target, currentRun?.id],
        queryFn: () =>
          currentRun ? getRunStatus(target, currentRun.id, toRunSeed(currentRun)) : null,
        enabled: Boolean(currentRun?.id),
        refetchInterval: (
          query: Query<DeploymentRun | null, Error, DeploymentRun | null, readonly unknown[]>,
        ) => {
          const run = query.state.data;
          return run?.status === "success" || run?.status === "failed" ? false : 5_000;
        },
        initialData: currentRun,
      };
    }),
  });

  const adminLatestRunQuery = latestRunQueries[0];
  const clientLatestRunQuery = latestRunQueries[1];
  const adminRunQuery = runQueries[0];
  const clientRunQuery = runQueries[1];
  const latestRunErrors: TargetErrorState = {
    admin: adminLatestRunQuery.error
      ? getErrorMessage(
          adminLatestRunQuery.error,
          "Unable to locate the latest Admin workflow run.",
        )
      : undefined,
    client: clientLatestRunQuery.error
      ? getErrorMessage(
          clientLatestRunQuery.error,
          "Unable to locate the latest Client workflow run.",
        )
      : undefined,
  };
  const failedTargets = selectedTargets.filter((target) => {
    return (
      targets[target].currentRun?.status === "failed" ||
      Boolean(dispatchErrors[target]) ||
      Boolean(latestRunErrors[target])
    );
  });

  useEffect(() => {
    if (!adminLatestRunQuery.data) {
      return;
    }

    setCurrentRun("admin", adminLatestRunQuery.data);
    queryClient.invalidateQueries({ queryKey: ["recent-runs"] });
    toast.success(`Admin run #${adminLatestRunQuery.data.runId} detected`);
  }, [adminLatestRunQuery.data, queryClient, setCurrentRun]);

  useEffect(() => {
    if (!clientLatestRunQuery.data) {
      return;
    }

    setCurrentRun("client", clientLatestRunQuery.data);
    queryClient.invalidateQueries({ queryKey: ["recent-runs"] });
    toast.success(`Client run #${clientLatestRunQuery.data.runId} detected`);
  }, [clientLatestRunQuery.data, queryClient, setCurrentRun]);

  useEffect(() => {
    if (!adminLatestRunQuery.error) {
      return;
    }

    toast.error(
      getErrorMessage(
        adminLatestRunQuery.error,
        "Unable to locate the latest Admin workflow run.",
      ),
    );
  }, [adminLatestRunQuery.error]);

  useEffect(() => {
    if (!clientLatestRunQuery.error) {
      return;
    }

    toast.error(
      getErrorMessage(
        clientLatestRunQuery.error,
        "Unable to locate the latest Client workflow run.",
      ),
    );
  }, [clientLatestRunQuery.error]);

  useEffect(() => {
    if (adminRunQuery.data) {
      setCurrentRun("admin", adminRunQuery.data);
      queryClient.invalidateQueries({ queryKey: ["recent-runs"] });
    }
  }, [adminRunQuery.data, queryClient, setCurrentRun]);

  useEffect(() => {
    if (clientRunQuery.data) {
      setCurrentRun("client", clientRunQuery.data);
      queryClient.invalidateQueries({ queryKey: ["recent-runs"] });
    }
  }, [clientRunQuery.data, queryClient, setCurrentRun]);

  useEffect(() => {
    if (commandRef.current === commandCount) {
      return;
    }

    commandRef.current = commandCount;
    if (validation && readyTargets.length === selectedTargets.length && selectedTargets.length) {
      void deployMutation.mutateAsync(selectedTargets);
    } else {
      startTransition(() => setActiveStep(3));
    }
  }, [
    commandCount,
    deployMutation,
    readyTargets.length,
    selectedTargets,
    setActiveStep,
    validation,
  ]);

  const allTerminal =
    selectedTargets.length > 0 &&
    selectedTargets.every((target) => {
      const status = targets[target].currentRun?.status;
      return (
        status === "success" ||
        status === "failed" ||
        Boolean(dispatchErrors[target]) ||
        Boolean(latestRunErrors[target])
      );
    });

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-white/75 via-white/55 to-sky-500/10 dark:from-slate-950/70 dark:via-slate-950/50 dark:to-sky-500/10">
          <CardContent className="flex flex-col gap-6 p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Bamboo Feature Builder</Badge>
              <Badge variant="outline">Admin + Client</Badge>
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight lg:text-5xl">
                Validate the backend once, then deploy Admin, Client, or both with separate BAM tickets.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                The builder now orchestrates two frontend repositories with independent branch discovery, workflow polling, and final preview URLs.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <HeroMetric label="Backend source" value={validation?.branchToken ?? "Awaiting validation"} />
              <HeroMetric label="Targets selected" value={`${selectedTargets.length}`} />
              <HeroMetric label="Active runs" value={`${activeRuns.length}`} />
              <HeroMetric label="Completed targets" value={`${successfulTargets.length}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Keyboard Shortcuts
            </Badge>
            <CardTitle className="text-xl">Command palette</CardTitle>
            <CardDescription>
              Use Ctrl/⌘ + K to validate backend input, refresh branch discovery, or dispatch both frontend workflows from one place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <Shortcut label="Validate Backend" value="Ctrl/⌘ K" />
            <Shortcut label="Find Branches" value="Step 2 action" />
            <Shortcut label="Deploy Targets" value="Step 3 action" />
            <Shortcut label="Toggle Theme" value="Quick action" />
          </CardContent>
        </Card>
      </div>

      <WizardStepper activeStep={activeStep} />

      <AnimatePresence mode="wait">
        {activeStep === 1 ? (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <BackendValidatorCard />
          </motion.div>
        ) : null}

        {activeStep === 2 ? (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <FrontendTargetsStep />
          </motion.div>
        ) : null}

        {activeStep === 3 ? (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <DeployStep
              selectedTargets={selectedTargets}
              dispatchErrors={dispatchErrors}
              dispatchingTargets={dispatchingTargets}
              deployPending={deployMutation.isPending}
              allTerminal={allTerminal}
              successfulTargets={successfulTargets}
              failedTargets={failedTargets}
              pendingLookups={pendingLookups}
              latestRunErrors={latestRunErrors}
              onDeploySelected={() => void deployMutation.mutateAsync(selectedTargets)}
              onRetryTarget={(target) => void deployMutation.mutateAsync([target])}
              onReset={() => {
                setPendingLookups(EMPTY_PENDING_LOOKUPS);
                setDispatchErrors({});
                reset();
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DeployStep({
  selectedTargets,
  dispatchErrors,
  dispatchingTargets,
  deployPending,
  allTerminal,
  successfulTargets,
  failedTargets,
  pendingLookups,
  latestRunErrors,
  onDeploySelected,
  onRetryTarget,
  onReset,
}: {
  selectedTargets: RepoTarget[];
  dispatchErrors: TargetErrorState;
  dispatchingTargets: RepoTarget[];
  deployPending: boolean;
  allTerminal: boolean;
  successfulTargets: RepoTarget[];
  failedTargets: RepoTarget[];
  pendingLookups: PendingLookupState;
  latestRunErrors: TargetErrorState;
  onDeploySelected: () => void;
  onRetryTarget: (target: RepoTarget) => void;
  onReset: () => void;
}) {
  const validation = useWizardStore((state) => state.validation);
  const targets = useWizardStore((state) => state.targets);

  if (!validation || !selectedTargets.length) {
    return (
      <Card>
        <CardContent className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
            <Rocket className="size-7" />
          </div>
          <p className="mt-6 font-display text-2xl font-semibold">Deployment is blocked</p>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Finish backend validation and choose at least one frontend target with a selected branch before dispatching workflows.
          </p>
        </CardContent>
      </Card>
    );
  }

  const deployableTargets = selectedTargets.filter((target) => {
    return (
      Boolean(extractTicketDigits(targets[target].ticketDigits)) &&
      Boolean(targets[target].selectedBranch)
    );
  });
  const canDeploy = deployableTargets.length === selectedTargets.length;
  const allLinks = [
    validation.swaggerUrl,
    validation.healthUrl,
    ...successfulTargets.map((target) =>
      buildFrontendUrl(
        extractTicketDigits(targets[target].ticketDigits) ?? validation.ticketDigits,
        target,
      ),
    ),
  ].join("\n");

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/10">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Step 3</Badge>
            <Badge variant="success">{validation.branchToken}</Badge>
            {selectedTargets.map((target) => (
              <Badge key={target} variant="outline">
                {TARGET_META[target].shortLabel}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-2xl">Deploy and monitor selected frontend targets</CardTitle>
          <CardDescription>
            Each selected repo dispatches the same deploy workflow independently, then polls workflow and job status in parallel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <DeploySummary label="Backend Ticket" value={validation.branchToken} />
            <DeploySummary label="Selected Targets" value={`${selectedTargets.length}`} />
            <DeploySummary label="Successful" value={`${successfulTargets.length}`} />
            <DeploySummary label="Failed" value={`${failedTargets.length}`} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-14 px-7 text-base"
              onClick={onDeploySelected}
              disabled={!canDeploy || deployPending}
            >
              {deployPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Rocket className="size-5" />
              )}
              Deploy Selected Targets
            </Button>
            <Button
              variant="secondary"
              disabled={!successfulTargets.length}
              onClick={async () => {
                await navigator.clipboard.writeText(allLinks);
                toast.success("Environment links copied");
              }}
            >
              <Copy className="size-4" />
              Copy Current Links
            </Button>
          </div>
          {!canDeploy ? (
            <p className="text-sm text-muted-foreground">
              Every selected target needs valid BAM digits and a selected branch before deploy can start.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {allTerminal && successfulTargets.length ? (
        <SuccessSummaryCard
          successfulTargets={successfulTargets}
          failedTargets={failedTargets}
          onReset={onReset}
          validation={validation}
          targets={targets}
        />
      ) : null}

      <div className={`grid gap-6 ${selectedTargets.length > 1 ? "2xl:grid-cols-2" : ""}`}>
        {selectedTargets.map((target) => {
          const targetState = targets[target];
          const parsedTicketDigits =
            extractTicketDigits(targetState.ticketDigits) ?? validation.ticketDigits;
          const currentRun = targetState.currentRun;
          const waitingForRun =
            Boolean(pendingLookups[target]) &&
            !currentRun &&
            !dispatchErrors[target] &&
            !latestRunErrors[target];

          return (
            <TargetDeploymentPanel
              key={target}
              target={target}
              currentRun={currentRun}
              branchName={targetState.selectedBranch?.name ?? `deploy-${toBranchToken(parsedTicketDigits)}`}
              branchToken={toBranchToken(parsedTicketDigits)}
              frontendUrl={buildFrontendUrl(parsedTicketDigits, target)}
              isDispatching={dispatchingTargets.includes(target)}
              waitingForRun={waitingForRun}
              dispatchError={dispatchErrors[target] ?? latestRunErrors[target]}
              onRetry={() => onRetryTarget(target)}
            />
          );
        })}
      </div>
    </div>
  );
}

function TargetDeploymentPanel({
  target,
  currentRun,
  branchName,
  branchToken,
  frontendUrl,
  isDispatching,
  waitingForRun,
  dispatchError,
  onRetry,
}: {
  target: RepoTarget;
  currentRun: DeploymentRun | null;
  branchName: string;
  branchToken: string;
  frontendUrl: string;
  isDispatching: boolean;
  waitingForRun: boolean;
  dispatchError?: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={target === "admin" ? "secondary" : "outline"}>
              {TARGET_META[target].label}
            </Badge>
            <Badge variant="success">{branchToken}</Badge>
            <Badge variant="outline">{branchName}</Badge>
          </div>
          <CardTitle className="text-xl">Deployment target summary</CardTitle>
          <CardDescription>
            {TARGET_META[target].repoSlug} will deploy to {frontendUrl}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <DeploySummary label="Target" value={TARGET_META[target].shortLabel} />
          <DeploySummary label="Branch" value={branchName} />
          <DeploySummary label="Preview URL" value={frontendUrl} />
        </CardContent>
      </Card>

      {isDispatching && !currentRun ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="font-medium">Dispatching {TARGET_META[target].shortLabel} workflow</p>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {waitingForRun && !currentRun ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <p className="font-medium">Waiting for GitHub to create the run</p>
            </div>
            <p className="text-sm text-muted-foreground">
              The dispatch was accepted for {TARGET_META[target].label}. The dashboard is polling until the latest run appears for {branchName}.
            </p>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {dispatchError && !currentRun ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-300">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">
                  {TARGET_META[target].shortLabel} dispatch failed
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{dispatchError}</p>
              </div>
            </div>
            <Button onClick={onRetry}>
              <Rocket className="size-4" />
              Retry {TARGET_META[target].shortLabel}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {currentRun ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <DeployTimeline run={currentRun} />
            {currentRun.status === "failed" ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="overflow-hidden border-red-500/20 bg-gradient-to-br from-red-500/10 via-background to-sky-500/10">
                  <CardContent className="space-y-5 p-8">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-red-500/10 text-red-600 dark:text-red-300">
                        <XCircle className="size-7" />
                      </div>
                      <div>
                        <p className="font-display text-2xl font-semibold">
                          {TARGET_META[target].shortLabel} workflow failed
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Review the GitHub logs, fix the branch, then retry only this target.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild variant="outline">
                        <a href={currentRun.logUrl} target="_blank" rel="noreferrer">
                          Open Run Logs
                          <ArrowUpRight className="size-4" />
                        </a>
                      </Button>
                      <Button onClick={onRetry}>
                        <Rocket className="size-4" />
                        Retry {TARGET_META[target].shortLabel}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </div>
          <RunSummaryCard run={currentRun} />
        </div>
      ) : null}
    </div>
  );
}

function SuccessSummaryCard({
  successfulTargets,
  failedTargets,
  onReset,
  validation,
  targets,
}: {
  successfulTargets: RepoTarget[];
  failedTargets: RepoTarget[];
  onReset: () => void;
  validation: BackendValidationResult;
  targets: Record<RepoTarget, FrontendTargetState>;
}) {
  const partial = Boolean(failedTargets.length);
  const links = successfulTargets.map((target) => ({
    target,
    url: buildFrontendUrl(
      extractTicketDigits(targets[target].ticketDigits) ?? validation.ticketDigits,
      target,
    ),
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10">
        <CardContent className="space-y-6 p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              {partial ? <Sparkles className="size-7" /> : <CheckCircle2 className="size-7" />}
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">
                {partial ? "Partial deploy complete" : "Feature environments are live"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {partial
                  ? "At least one target deployed successfully. Failed targets can be retried independently below."
                  : "Share the frontend and backend links directly with QA."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SuccessLink label="Swagger URL" value={validation.swaggerUrl} />
            <SuccessLink label="Health URL" value={validation.healthUrl} />
            {links.map((entry) => (
              <SuccessLink
                key={entry.target}
                label={`${TARGET_META[entry.target].shortLabel} URL`}
                value={entry.url}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {links.map((entry) => (
              <Button asChild key={entry.target}>
                <a href={entry.url} target="_blank" rel="noreferrer">
                  Open {TARGET_META[entry.target].shortLabel}
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            ))}
            <Button asChild variant="outline">
              <a href={validation.swaggerUrl} target="_blank" rel="noreferrer">
                Open Swagger
                <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const payload = [
                  validation.swaggerUrl,
                  validation.healthUrl,
                  ...links.map((entry) => entry.url),
                ].join("\n");
                await navigator.clipboard.writeText(payload);
                toast.success("All successful environment links copied");
              }}
            >
              <Copy className="size-4" />
              Copy All Links
            </Button>
            <Button variant="outline" onClick={onReset}>
              <WandSparkles className="size-4" />
              Create another
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.45rem] border border-white/50 bg-white/75 p-4 shadow-soft dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function Shortcut({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-3">
      <span>{label}</span>
      <span className="rounded-full border border-border px-3 py-1 text-xs tracking-widest text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

function DeploySummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-medium">{value}</p>
    </div>
  );
}

function SuccessLink({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-start gap-2">
        <p className="min-w-0 flex-1 break-all text-sm font-medium">{value}</p>
        <CopyButton value={value} label={label.toLowerCase()} />
      </div>
    </div>
  );
}
