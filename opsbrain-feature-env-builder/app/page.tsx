"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  GitBranch,
  Loader2,
  Settings2,
  Workflow,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TARGET_META } from "@/lib/feature-env";
import { getGithubPublicConfig, listRecentRuns } from "@/lib/mockApi";
import { formatRelativeMinutes, formatShortDate } from "@/lib/utils";

function statusVariant(status: "queued" | "running" | "success" | "failed") {
  if (status === "success") {
    return "success";
  }

  if (status === "running") {
    return "warning";
  }

  if (status === "failed") {
    return "destructive";
  }

  return "secondary";
}

export default function DashboardPage() {
  const runsQuery = useQuery({
    queryKey: ["dashboard-runs"],
    queryFn: listRecentRuns,
    refetchInterval: 4_000,
  });

  const configQuery = useQuery({
    queryKey: ["dashboard-github-config"],
    queryFn: getGithubPublicConfig,
  });

  const runs = runsQuery.data ?? [];
  const activeRuns = runs.filter((run) => run.status === "queued" || run.status === "running");
  const successfulRuns = runs.filter((run) => run.status === "success");
  const failedRuns = runs.filter((run) => run.status === "failed");
  const latestRun = runs[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-white/80 via-white/60 to-sky-500/10 dark:from-slate-950/70 dark:via-slate-950/55 dark:to-sky-500/10">
          <CardContent className="space-y-6 p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Dashboard</Badge>
              <Badge variant="outline">Operations Overview</Badge>
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight lg:text-5xl">
                Manage Bamboo feature environments from one operational workspace.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                Start a new deployment, review live run status, and verify repository connectivity for Admin and Client without leaving the dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/tech/feature-env">
                  Open Feature Env Builder
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/runs">View recent runs</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/settings">Open settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
          <MetricCard
            label="Tracked Runs"
            value={runsQuery.isLoading ? "..." : String(runs.length)}
            hint="Recent Admin and Client deployments stored by this workspace."
            icon={<Workflow className="size-5" />}
          />
          <MetricCard
            label="Active Runs"
            value={runsQuery.isLoading ? "..." : String(activeRuns.length)}
            hint="Queued and in-progress workflows across both frontend targets."
            icon={<Clock3 className="size-5" />}
          />
          <MetricCard
            label="Latest Result"
            value={
              runsQuery.isLoading
                ? "..."
                : latestRun
                  ? `${TARGET_META[latestRun.target].shortLabel} ${latestRun.status}`
                  : "No runs yet"
            }
            hint={
              latestRun
                ? `Updated ${formatRelativeMinutes(latestRun.updatedAt)}`
                : "Start the first environment deployment from the builder."
            }
            icon={<CheckCircle2 className="size-5" />}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Recent Activity
            </Badge>
            <CardTitle className="text-2xl">Deployment runs</CardTitle>
            <CardDescription>
              The latest tracked workflow runs across Admin and Client targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {runsQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-3 h-4 w-48" />
                  <Skeleton className="mt-4 h-10 w-full" />
                </div>
              ))
            ) : runs.length ? (
              runs.slice(0, 5).map((run) => (
                <div
                  key={`${run.target}-${run.id}`}
                  className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={run.target === "admin" ? "secondary" : "outline"}>
                          {TARGET_META[run.target].shortLabel}
                        </Badge>
                        <p className="font-medium">{run.branchToken}</p>
                        <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{run.branch}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatShortDate(run.updatedAt)} · {formatRelativeMinutes(run.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={run.logUrl} target="_blank" rel="noreferrer">
                          Logs
                          <ArrowUpRight className="size-4" />
                        </a>
                      </Button>
                      <Button asChild size="sm">
                        <a href={run.frontendUrl} target="_blank" rel="noreferrer">
                          Open
                          <ArrowUpRight className="size-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border bg-secondary/25 p-8 text-center">
                <p className="font-display text-lg font-semibold">No deployments yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Open the Feature Environment Builder to validate a backend and launch the first Admin or Client deployment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Badge variant="outline" className="w-fit">
                Repository Status
              </Badge>
              <CardTitle className="text-2xl">Connected targets</CardTitle>
              <CardDescription>
                Current repository configuration used by the deployment routes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configQuery.isLoading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 w-full" />
                ))
              ) : configQuery.data ? (
                <>
                  {(["admin", "client"] as const).map((target) => (
                    <div
                      key={target}
                      className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={target === "admin" ? "secondary" : "outline"}>
                          {TARGET_META[target].label}
                        </Badge>
                        <Badge
                          variant={configQuery.data.tokenConfigured ? "success" : "destructive"}
                        >
                          {configQuery.data.tokenConfigured ? "Ready" : "Token required"}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm font-medium">
                        {configQuery.data.targets[target].owner}/{configQuery.data.targets[target].repo}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Workflow: {configQuery.data.targets[target].workflowId}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-[1.4rem] border border-border/70 bg-secondary/35 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Default Base Branch
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {configQuery.data.defaultBaseBranch}
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-[1.4rem] border border-red-500/20 bg-red-500/5 p-4 text-sm text-muted-foreground">
                  Unable to load repository configuration.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Badge variant="outline" className="w-fit">
                Health Snapshot
              </Badge>
              <CardTitle className="text-2xl">Current run distribution</CardTitle>
              <CardDescription>
                A quick summary of tracked outcomes across this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <StatBlock
                label="Successful"
                value={runsQuery.isLoading ? "..." : String(successfulRuns.length)}
                icon={<CheckCircle2 className="size-4" />}
                tone="success"
              />
              <StatBlock
                label="Active"
                value={runsQuery.isLoading ? "..." : String(activeRuns.length)}
                icon={
                  runsQuery.isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Clock3 className="size-4" />
                  )
                }
                tone="warning"
              />
              <StatBlock
                label="Failed"
                value={runsQuery.isLoading ? "..." : String(failedRuns.length)}
                icon={<XCircle className="size-4" />}
                tone="destructive"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBlock({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "success" | "warning" | "destructive";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
        : "bg-red-500/10 text-red-600 dark:text-red-300";

  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${toneClasses}`}>{icon}</div>
      </div>
    </div>
  );
}
