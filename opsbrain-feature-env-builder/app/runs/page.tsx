"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TARGET_META } from "@/lib/feature-env";
import { listRecentRuns } from "@/lib/mockApi";
import { formatRelativeMinutes, formatShortDate } from "@/lib/utils";

export default function RunsPage() {
  const [tab, setTab] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["runs-page"],
    queryFn: listRecentRuns,
    refetchInterval: 4_000,
  });

  const filtered =
    data?.filter((run) => {
      if (tab === "active") {
        return run.status !== "success";
      }

      if (tab === "success") {
        return run.status === "success";
      }

      return true;
    }) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Runs
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Recent deploy runs</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This list is powered by the tracked workflow runs created through the Feature Builder.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="success">Successful</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          <div className="grid gap-4 lg:grid-cols-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 p-6">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-14 w-full" />
                    </CardContent>
                  </Card>
                ))
              : filtered.map((run) => (
                  <Card key={run.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={run.target === "admin" ? "secondary" : "outline"}>
                              {TARGET_META[run.target].shortLabel}
                            </Badge>
                            <CardTitle className="text-xl">{run.branchToken}</CardTitle>
                          </div>
                          <CardDescription>{run.branch}</CardDescription>
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
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Last updated</p>
                        <p className="mt-2 text-sm font-medium">{formatShortDate(run.updatedAt)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeMinutes(run.updatedAt)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">{run.frontendUrl}</span>
                        <Button asChild variant="outline">
                          <Link href={run.logUrl} target="_blank">
                            Open logs
                            {run.status === "running" ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpRight className="size-4" />}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            {!isLoading && !filtered.length ? (
              <Card className="lg:col-span-2">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No tracked workflow runs yet. Trigger a deployment from the Feature Builder to populate this view.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
