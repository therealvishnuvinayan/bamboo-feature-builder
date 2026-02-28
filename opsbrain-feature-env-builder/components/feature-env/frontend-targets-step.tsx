"use client";

import { motion } from "framer-motion";
import { ArrowRight, Layers3, Rocket, ShieldCheck } from "lucide-react";
import { startTransition } from "react";
import { toast } from "sonner";

import { FrontendTargetPanel } from "@/components/feature-env/frontend-target-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildFrontendUrl,
  extractTicketDigits,
  REPO_TARGETS,
  TARGET_META,
  toBranchToken,
} from "@/lib/feature-env";
import { useWizardStore } from "@/lib/wizard-store";

export function FrontendTargetsStep() {
  const validation = useWizardStore((state) => state.validation);
  const targets = useWizardStore((state) => state.targets);
  const setActiveStep = useWizardStore((state) => state.setActiveStep);
  const setTargetEnabled = useWizardStore((state) => state.setTargetEnabled);

  if (!validation) {
    return (
      <Card>
        <CardContent className="flex min-h-[340px] flex-col items-center justify-center text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/10 text-primary">
            <ShieldCheck className="size-7" />
          </div>
          <p className="mt-6 font-display text-xl font-semibold">Validate a backend first</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Frontend target discovery depends on the validated BAM ticket and backend URLs from Step 1.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedTargets = REPO_TARGETS.filter((target) => targets[target].enabled);
  const readyTargets = selectedTargets.filter((target) => {
    return (
      Boolean(extractTicketDigits(targets[target].ticketDigits)) &&
      Boolean(targets[target].selectedBranch)
    );
  });
  const allReady = selectedTargets.length > 0 && readyTargets.length === selectedTargets.length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/10">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Step 2</Badge>
            <Badge variant="success">{validation.branchToken} backend live</Badge>
            <Badge variant="outline">{selectedTargets.length} target(s) selected</Badge>
          </div>
          <CardTitle className="text-2xl">Choose frontend targets and branches</CardTitle>
          <CardDescription>
            Pick Admin, Client, or both. Each target can reuse the backend ticket or point to a different BAM ticket before deployment.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {REPO_TARGETS.map((target) => {
              const isEnabled = targets[target].enabled;
              const parsedTicketDigits = extractTicketDigits(targets[target].ticketDigits);
              const preview =
                parsedTicketDigits ? buildFrontendUrl(parsedTicketDigits, target) : "Waiting for valid digits";

              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => {
                    if (isEnabled && selectedTargets.length === 1) {
                      toast.error("At least one deployment target must remain selected.");
                      return;
                    }

                    setTargetEnabled(target, !isEnabled);
                  }}
                  className={`rounded-[1.5rem] border p-5 text-left transition-all ${
                    isEnabled
                      ? "border-primary/30 bg-primary/5 shadow-soft"
                      : "border-border/70 bg-background/65"
                  }`}
                  aria-pressed={isEnabled}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-lg font-semibold">{TARGET_META[target].label}</p>
                        {isEnabled ? <Badge variant="success">Selected</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{TARGET_META[target].repoSlug}</p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        isEnabled
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Layers3 className="size-5" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p>Ticket: {parsedTicketDigits ? toBranchToken(parsedTicketDigits) : "not set"}</p>
                    <p className="break-all">Preview: {preview}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-[1.6rem] border border-border/70 bg-secondary/35 p-5">
            <p className="text-sm font-medium">Selection guidance</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Use both targets when QA needs the full admin and client experience for the same backend ticket.</p>
              <p>Keep Admin only when the work is internal tooling, or Client only when the customer portal changed independently.</p>
              <p>Each selected target must end on a branch containing its own BAM-#### token before deploy.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={`grid gap-6 ${selectedTargets.length > 1 ? "2xl:grid-cols-2" : ""}`}>
        {selectedTargets.map((target, index) => (
          <motion.div
            key={target}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <FrontendTargetPanel target={target} validation={validation} />
          </motion.div>
        ))}
      </div>

      <Card className="border-border/70">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={allReady ? "success" : "warning"}>
                {readyTargets.length}/{selectedTargets.length} target(s) ready
              </Badge>
              <Badge variant="outline">Backend {validation.branchToken}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Continue once every selected target has valid ticket digits and a selected branch.
            </p>
          </div>
          <Button
            size="lg"
            className="h-14 px-7 text-base"
            disabled={!allReady}
            onClick={() => startTransition(() => setActiveStep(3))}
          >
            Prepare Deploy View
            {allReady ? <ArrowRight className="size-4" /> : <Rocket className="size-4" />}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
