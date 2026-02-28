"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Cloud,
  Clock3,
  Loader2,
  Rocket,
  UploadCloud,
  Wrench,
  XCircle,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TARGET_META } from "@/lib/feature-env";
import type { DeploymentRun } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

function iconForStage(key: string) {
  switch (key) {
    case "queueing":
      return Clock3;
    case "build-react-app":
      return Wrench;
    case "deploy-infra":
      return Cloud;
    case "deploy-artifacts":
      return UploadCloud;
    case "done":
      return CheckCircle2;
    case "failed":
      return XCircle;
    default:
      return Rocket;
  }
}

function badgeVariant(status: "pending" | "running" | "complete" | "failed") {
  if (status === "complete") {
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

export function DeployTimeline({ run }: { run: DeploymentRun }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Deployment timeline</CardTitle>
            <CardDescription>
              {TARGET_META[run.target].label} workflow state and jobs update in real time with 5 second polling.
            </CardDescription>
          </div>
          <Badge
            variant={
              run.status === "success"
                ? "success"
                : run.status === "running"
                  ? "warning"
                  : run.status === "failed"
                    ? "destructive"
                    : "secondary"
            }
          >
            {run.status}
          </Badge>
        </div>
        <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{run.currentStageLabel}</p>
            <span className="text-sm text-muted-foreground">{run.progress}%</span>
          </div>
          <Progress className="mt-3" value={run.progress} />
          <p className="mt-3 text-xs text-muted-foreground">
            Job timing and progress are derived from the latest workflow run and job states returned by GitHub.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue={run.stages.find((stage) => stage.status === "running")?.key}>
          {run.stages.map((stage, index) => {
            const Icon = iconForStage(stage.key);

            return (
              <AccordionItem value={stage.key} key={stage.key}>
                <AccordionTrigger>
                  <div className="flex w-full items-center gap-4">
                    <motion.div
                      animate={stage.status === "running" ? { scale: [1, 1.05, 1] } : undefined}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        stage.status === "complete"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : stage.status === "failed"
                            ? "bg-red-500/10 text-red-600 dark:text-red-300"
                          : stage.status === "running"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {stage.status === "running" ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
                    </motion.div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{stage.label}</span>
                        <Badge variant={badgeVariant(stage.status)}>{stage.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stage.completedAt
                          ? `Finished ${formatShortDate(stage.completedAt)}`
                          : stage.startedAt
                            ? `Started ${formatShortDate(stage.startedAt)}`
                            : `Waiting on stage ${index}`}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {stage.details.map((detail) => (
                      <li key={detail} className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-3">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
