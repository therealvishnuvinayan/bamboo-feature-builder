"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Github, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TARGET_META } from "@/lib/feature-env";
import { fetchBranches, getGithubPublicConfig } from "@/lib/mockApi";

export function DeveloperPanel() {
  const configQuery = useQuery({
    queryKey: ["github-config"],
    queryFn: getGithubPublicConfig,
  });

  const connectivityMutation = useMutation({
    mutationFn: async () => {
      const [adminBranches, clientBranches] = await Promise.all([
        fetchBranches("admin", "9999"),
        fetchBranches("client", "9999"),
      ]);

      return {
        admin: adminBranches.length,
        client: clientBranches.length,
      };
    },
    onSuccess: (count) => {
      toast.success(
        `GitHub connectivity OK. Admin matches: ${count.admin}, Client matches: ${count.client}.`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "GitHub connectivity test failed.");
    },
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Github className="size-5" />
        </div>
        <CardTitle className="text-xl">Developer Panel</CardTitle>
        <CardDescription>
          Active GitHub configuration for both secure server-side route handlers and a quick dual-repo connectivity test.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {configQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : configQuery.isError ? (
          <div className="rounded-[1.4rem] border border-red-500/20 bg-red-500/5 p-4 text-sm text-muted-foreground">
            {configQuery.error instanceof Error
              ? configQuery.error.message
              : "Unable to load GitHub configuration."}
          </div>
        ) : configQuery.data ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {(["admin", "client"] as const).map((target) => (
                <div
                  key={target}
                  className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={target === "admin" ? "secondary" : "outline"}>
                      {TARGET_META[target].label}
                    </Badge>
                    <Badge variant="outline">
                      {configQuery.data.targets[target].workflowId}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    <ConfigLine label="Owner" value={configQuery.data.targets[target].owner} />
                    <ConfigLine label="Repository" value={configQuery.data.targets[target].repo} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ConfigLine label="Default Base Branch" value={configQuery.data.defaultBaseBranch} />
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Token
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={configQuery.data.tokenConfigured ? "success" : "destructive"}>
                    {configQuery.data.tokenConfigured ? "Configured" : "Missing"}
                  </Badge>
                  {configQuery.data.tokenConfigured ? (
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-300" />
                  ) : (
                    <TriangleAlert className="size-4 text-red-600 dark:text-red-300" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.4rem] border border-border/70 bg-secondary/35 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium">Test GitHub connectivity</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Calls the secure branch lookup route for Admin and Client with BAM ticket 9999 and surfaces auth, rate limit, or repo errors cleanly.
              </p>
            </div>
            <Button onClick={() => connectivityMutation.mutate()} disabled={connectivityMutation.isPending}>
              {connectivityMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Test GitHub Connectivity
            </Button>
          </div>
          {connectivityMutation.isError ? (
            <p className="mt-3 text-sm text-destructive">
              {connectivityMutation.error instanceof Error
                ? connectivityMutation.error.message
                : "GitHub connectivity test failed."}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-medium">{value}</p>
    </div>
  );
}
