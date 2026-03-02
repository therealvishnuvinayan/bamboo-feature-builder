"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BambooLogoMark } from "@/components/shared/bamboo-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getLocalAccessSession,
  LOCAL_ACCESS_QUERY_KEY,
  loginToLocalAccess,
} from "@/lib/local-auth";

const accessSchema = z.object({
  username: z.string().trim().min(1, "Enter username."),
  password: z.string().min(1, "Enter password."),
});

type AccessFormValues = z.infer<typeof accessSchema>;

export function LocalAccessGate({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: LOCAL_ACCESS_QUERY_KEY,
    queryFn: getLocalAccessSession,
  });

  const form = useForm<AccessFormValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: {
      username: "Bamboo",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: loginToLocalAccess,
    onSuccess: (session) => {
      queryClient.setQueryData(LOCAL_ACCESS_QUERY_KEY, session);
      form.reset({
        username: session.username,
        password: "",
      });
      toast.success("Access granted");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Invalid credentials.";
      form.setError("password", {
        type: "manual",
        message,
      });
      toast.error(message);
    },
  });

  function onSubmit(values: AccessFormValues) {
    form.clearErrors("password");
    loginMutation.mutate(values);
  }

  if (sessionQuery.isLoading) {
    return <AccessLoaderScreen />;
  }

  if (sessionQuery.data?.authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,41,146,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(23,185,147,0.12),transparent_24%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1280px] items-center px-4 py-8 md:px-6">
        <div className="grid w-full gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden flex-col justify-between rounded-[2rem] border border-white/40 bg-white/65 p-8 shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 xl:flex">
            <div>
              <Badge variant="secondary" className="gap-2">
                <ShieldCheck className="size-3.5" />
                Bamboo Feature Builder
              </Badge>
              <div className="mt-8 flex items-center gap-5">
                <BambooLogoMark className="h-20 w-20 rounded-[1.75rem]" />
                <div>
                  <p className="font-display text-4xl font-semibold tracking-tight text-[#002992] dark:text-white">
                    Bamboo
                  </p>
                  <p className="mt-1 text-lg text-muted-foreground">Feature Builder</p>
                </div>
              </div>
              <h1 className="mt-12 max-w-xl font-display text-5xl font-semibold tracking-tight">
                Secure access for the Bamboo Feature Builder workspace.
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground">
                Sign in to continue to the deployment workspace and manage feature environment runs.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Username
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {sessionQuery.data?.username || "Bamboo"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Workspace
                </p>
                <p className="mt-3 text-lg font-semibold">Admin + Client Environment Delivery</p>
              </div>
            </div>
          </div>

          <Card className="mx-auto w-full max-w-[560px] border-primary/10">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-4">
                <BambooLogoMark className="h-16 w-16 rounded-[1.4rem]" />
                <div>
                  <Badge variant="outline" className="w-fit">
                    Secure Access
                  </Badge>
                  <CardTitle className="mt-3 text-3xl">Sign in to Bamboo Feature Builder</CardTitle>
                </div>
              </div>
              <CardDescription>
                Enter your Bamboo workspace credentials to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {sessionQuery.data && !sessionQuery.data.configured ? (
                <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                      <AlertTriangle className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">Access is not configured</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Set <span className="font-medium text-foreground">LOCAL_ACCESS_PASSWORD</span> in the server environment to enable sign-in.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="local-username">Username</Label>
                  <Input
                    id="local-username"
                    aria-label="Username"
                    autoComplete="username"
                    {...form.register("username")}
                  />
                  {form.formState.errors.username ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.username.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="local-password">Password</Label>
                  <Input
                    id="local-password"
                    aria-label="Password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Use the configured Bamboo workspace credentials.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loginMutation.isPending || !sessionQuery.data?.configured}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="size-4" />
                  )}
                  Open Feature Builder
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccessLoaderScreen() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,41,146,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(23,185,147,0.12),transparent_24%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-[520px] rounded-[2rem] border border-white/40 bg-white/70 p-8 text-center shadow-soft backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary/10 text-primary shadow-soft">
            <BambooLogoMark className="h-14 w-14 rounded-[1.25rem]" />
          </div>
          <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">
            Bamboo Feature Builder
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Preparing your workspace.</p>
          <div className="mt-8 flex items-center justify-center gap-3 text-primary">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm font-medium">Checking access</span>
          </div>
          <div className="mt-8 grid gap-3">
            <div className="h-3 rounded-full bg-primary/10" />
            <div className="h-3 rounded-full bg-primary/10" />
            <div className="h-3 rounded-full bg-primary/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
