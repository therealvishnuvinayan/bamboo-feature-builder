"use client";

import { ArrowUpRight, CircleDot, GitCommitHorizontal } from "lucide-react";

import { CopyButton } from "@/components/shared/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TARGET_META } from "@/lib/feature-env";
import type { DeploymentRun } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

export function RunSummaryCard({ run }: { run: DeploymentRun }) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="w-fit">
            GitHub Run
          </Badge>
          <Badge variant={run.target === "admin" ? "secondary" : "outline"} className="w-fit">
            {TARGET_META[run.target].shortLabel}
          </Badge>
        </div>
        <CardTitle className="text-xl">Workflow dispatch details</CardTitle>
        <CardDescription>Live GitHub workflow metadata with direct links and copy actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SummaryRow label="Run ID" value={run.id} copyLabel="run id" />
        <SummaryRow label="Status" value={run.status} />
        <SummaryRow label="Conclusion" value={run.conclusion ?? "pending"} />
        <SummaryRow label="Branch" value={run.branch} copyLabel="branch" />
        <SummaryRow label="Created" value={formatShortDate(run.createdAt)} />

        <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Workflow</p>
              <p className="mt-2 text-sm font-medium">{run.workflowName}</p>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton value={run.logUrl} label="log link" />
              <Button asChild variant="outline" size="icon">
                <a aria-label="Open logs" href={run.logUrl} target="_blank" rel="noreferrer">
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  copyLabel,
}: {
  label: string;
  value: string;
  copyLabel?: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 break-all text-sm font-medium">{value}</p>
        </div>
        <div className="flex items-center gap-2">
          {copyLabel ? <CopyButton value={value} label={copyLabel} /> : null}
          {label === "Run ID" ? <CircleDot className="size-4 text-primary" /> : null}
          {label === "Branch" ? <GitCommitHorizontal className="size-4 text-primary" /> : null}
        </div>
      </div>
    </div>
  );
}
