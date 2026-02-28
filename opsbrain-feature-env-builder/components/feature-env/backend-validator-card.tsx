"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Loader2, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { startTransition, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { parseBackendInput } from "@/lib/feature-env";
import { validateBackend } from "@/lib/mockApi";
import { formatShortDate } from "@/lib/utils";
import { useWizardStore } from "@/lib/wizard-store";
import { useMutation } from "@tanstack/react-query";

const backendSchema = z.object({
  backendInput: z
    .string()
    .trim()
    .min(1, "Enter a BAM ticket number or Swagger URL.")
    .refine((value) => parseBackendInput(value) !== null, {
      message: "Use a BAM ticket like 8107 or a bamboo Swagger URL.",
    }),
});

type BackendFormValues = z.infer<typeof backendSchema>;

export function BackendValidatorCard() {
  const backendInput = useWizardStore((state) => state.backendInput);
  const validation = useWizardStore((state) => state.validation);
  const commandCount = useWizardStore((state) => state.commandCounters.validate);
  const setActiveStep = useWizardStore((state) => state.setActiveStep);
  const setBackendInput = useWizardStore((state) => state.setBackendInput);
  const setValidation = useWizardStore((state) => state.setValidation);
  const commandRef = useRef(commandCount);

  const form = useForm<BackendFormValues>({
    resolver: zodResolver(backendSchema),
    defaultValues: {
      backendInput,
    },
  });

  const watchedInput = form.watch("backendInput");
  const parsed = useMemo(() => parseBackendInput(watchedInput), [watchedInput]);

  useEffect(() => {
    setBackendInput(watchedInput);
  }, [setBackendInput, watchedInput]);

  const mutation = useMutation({
    mutationFn: validateBackend,
    onSuccess: (result) => {
      setValidation(result);
      toast.success(`${result.branchToken} backend validated`);
      startTransition(() => setActiveStep(2));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Backend validation failed.";
      toast.error(message);
    },
  });

  useEffect(() => {
    if (commandRef.current === commandCount) {
      return;
    }

    commandRef.current = commandCount;
    void form.handleSubmit(async (values) => {
      await mutation.mutateAsync(values.backendInput);
    })();
  }, [commandCount, form, mutation]);

  async function onSubmit(values: BackendFormValues) {
    await mutation.mutateAsync(values.backendInput);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden border-primary/10">
        <CardHeader className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <Badge variant="secondary" className="w-fit">
            Step 1
          </Badge>
          <CardTitle className="text-2xl">Validate backend source</CardTitle>
          <CardDescription>
            Accept a Swagger URL or BAM ticket number and build the feature environment metadata live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="backend-input">Swagger URL or Ticket Number</Label>
              <Input
                id="backend-input"
                aria-label="Swagger URL or Ticket Number"
                placeholder="8107 or https://bamboo-api-bam-8107.dev2.bamboocardportal.com/swagger/index.html"
                {...form.register("backendInput")}
              />
              {form.formState.errors.backendInput ? (
                <p className="text-sm text-destructive">{form.formState.errors.backendInput.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Example: <span className="font-medium text-foreground">8107</span> or the full swagger URL.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Validate Backend
              </Button>
              {validation ? (
                <Badge variant="success" className="px-4 text-sm">
                  <CheckCircle2 className="size-4" />
                  Backend Live
                </Badge>
              ) : null}
            </div>
          </form>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
              <p className="text-sm font-medium">Validation states</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  Idle and waiting for input
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse-glow" />
                  Server-side health-check + swagger fallback
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Ready to discover frontend branches
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-sky-500/10 via-background to-teal-400/10 p-5">
              <p className="text-sm font-medium">Expected deploy target</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Once validated, the wizard builds a frontend preview URL and unlocks deploy orchestration.
              </p>
            </div>
          </div>

          {mutation.isPending ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-5">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                <p className="text-sm font-medium">Validating backend environment</p>
              </div>
              <div className="mt-4 grid gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : null}

          {mutation.isError ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[1.5rem] border border-red-500/20 bg-red-500/5 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-red-500/10 p-3 text-red-600 dark:text-red-300">
                  <ShieldAlert className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold">Validation failed</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mutation.error instanceof Error ? mutation.error.message : "Unknown validation error."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" variant="destructive" onClick={form.handleSubmit(onSubmit)}>
                      <RefreshCw className="size-4" />
                      Retry
                    </Button>
                    <Badge variant="warning">Hint: backend deploy may still be booting</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}

          {validation ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/5 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-300" />
                    <p className="font-display text-lg font-semibold">Backend Live</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last checked {formatShortDate(validation.checkedAt)} with {validation.latencyMs}ms response time via{" "}
                    {validation.validatedBy === "health" ? "health-check" : "swagger fallback"}.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <a href={validation.swaggerUrl} target="_blank" rel="noreferrer">
                    Open Swagger
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              </div>
            </motion.div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-gradient-to-br from-background via-background to-sky-500/5">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Live Parse Preview
          </Badge>
          <CardTitle className="text-xl">Environment metadata</CardTitle>
          <CardDescription>
            Derived immediately from the current input before the async validation runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {parsed ? (
            <>
              <PreviewLine label="Ticket detected" value={parsed.canonicalTicket} emphasize />
              <PreviewLine label="Branch token" value={parsed.branchToken} />
              <PreviewLine label="Backend host" value={parsed.backendHost} />
              <PreviewLine label="API base URL" value={parsed.apiBaseUrl} />
              <PreviewLine label="Health URL" value={parsed.healthUrl} />
              <PreviewLine label="Swagger URL" value={parsed.swaggerUrl} />
            </>
          ) : (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-secondary/30 px-6 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-6" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold">Waiting for a valid source</p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Enter a BAM ticket or a bamboo swagger URL to preview the generated backend and frontend environment links.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PreviewLine({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-2 break-all text-sm ${emphasize ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
