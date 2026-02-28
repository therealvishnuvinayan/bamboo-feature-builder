"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock3, Loader2, Workflow } from "lucide-react";

import { CopyButton } from "@/components/shared/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { TARGET_META } from "@/lib/feature-env";
import { listRecentRuns } from "@/lib/mockApi";
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

export function ActivityDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-runs"],
    queryFn: listRecentRuns,
    refetchInterval: 4_000,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader className="pr-12">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Workflow className="size-5" />
          </div>
          <SheetTitle>Recent Activity</SheetTitle>
          <SheetDescription>
            Browser-tracked workflow runs, refreshed with live GitHub status updates.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-6 pb-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="glass-panel-subtle rounded-[1.5rem] p-5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-3 h-4 w-48" />
                  <Skeleton className="mt-4 h-11 w-full" />
                </div>
              ))
            : data?.length
              ? data.map((run) => (
                <div key={run.id} className="glass-panel-subtle rounded-[1.5rem] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={run.target === "admin" ? "secondary" : "outline"}>
                          {TARGET_META[run.target].shortLabel}
                        </Badge>
                        <p className="font-display text-base font-semibold">{run.branchToken}</p>
                        <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {TARGET_META[run.target].repoSlug}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{run.branch}</p>
                    </div>
                    <CopyButton value={run.id} label="run id" />
                  </div>
                  <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3.5" />
                      {formatRelativeMinutes(run.updatedAt)}
                    </span>
                    <span>{formatShortDate(run.updatedAt)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Preview URL</p>
                      <p className="text-xs text-muted-foreground">{run.frontendUrl}</p>
                    </div>
                    <Button asChild size="icon" variant="ghost">
                      <a aria-label="Open run link" href={run.logUrl} target="_blank" rel="noreferrer">
                        {run.status === "running" ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
                      </a>
                    </Button>
                  </div>
                </div>
              ))
              : (
                <div className="glass-panel-subtle rounded-[1.5rem] p-5 text-sm text-muted-foreground">
                  Trigger a deployment from the Feature Builder to start populating recent activity.
                </div>
              )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
