"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  GitBranch,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { CreateBranchModal } from "@/components/feature-env/create-branch-modal";
import { EmptyStateIllustration } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildFrontendUrl,
  extractTicketDigits,
  TARGET_META,
  toBranchToken,
} from "@/lib/feature-env";
import { fetchBranches } from "@/lib/mockApi";
import type { BackendValidationResult, BranchRecord, RepoTarget } from "@/lib/types";
import { formatRelativeMinutes } from "@/lib/utils";
import { useWizardStore } from "@/lib/wizard-store";

export function FrontendTargetPanel({
  target,
  validation,
}: {
  target: RepoTarget;
  validation: BackendValidationResult;
}) {
  const targetState = useWizardStore((state) => state.targets[target]);
  const commandCount = useWizardStore((state) => state.commandCounters.branches);
  const setCreatedBranch = useWizardStore((state) => state.setCreatedBranch);
  const setSelectedBranch = useWizardStore((state) => state.setSelectedBranch);
  const setTargetTicketDigits = useWizardStore((state) => state.setTargetTicketDigits);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const commandRef = useRef(commandCount);
  const deferredSearch = useDeferredValue(search);
  const parsedTicketDigits = extractTicketDigits(targetState.ticketDigits);
  const branchToken = parsedTicketDigits ? toBranchToken(parsedTicketDigits) : "BAM-####";

  const branchesQuery = useQuery({
    queryKey: ["branches", target, parsedTicketDigits],
    queryFn: () => fetchBranches(target, parsedTicketDigits ?? ""),
    enabled: targetState.enabled && Boolean(parsedTicketDigits),
  });

  useEffect(() => {
    if (commandRef.current === commandCount) {
      return;
    }

    commandRef.current = commandCount;
    if (targetState.enabled && parsedTicketDigits) {
      void branchesQuery.refetch();
    }
  }, [branchesQuery, commandCount, parsedTicketDigits, targetState.enabled]);

  useEffect(() => {
    if (!branchesQuery.data) {
      return;
    }

    if (branchesQuery.data.length === 1) {
      setSelectedBranch(target, branchesQuery.data[0]);
      return;
    }

    if (
      targetState.selectedBranch &&
      !branchesQuery.data.some((branch) => branch.name === targetState.selectedBranch?.name)
    ) {
      setSelectedBranch(target, null);
    }

    if (!branchesQuery.data.length) {
      setSelectedBranch(target, null);
    }
  }, [branchesQuery.data, setSelectedBranch, target, targetState.selectedBranch]);

  const filteredBranches =
    branchesQuery.data?.filter((branch) => {
      if (!deferredSearch.trim()) {
        return true;
      }

      const query = deferredSearch.toLowerCase();
      return (
        branch.name.toLowerCase().includes(query) ||
        branch.message.toLowerCase().includes(query) ||
        branch.sha.toLowerCase().includes(query)
      );
    }) ?? [];

  const selectedBranch =
    filteredBranches.find((branch) => branch.name === targetState.selectedBranch?.name) ??
    branchesQuery.data?.find((branch) => branch.name === targetState.selectedBranch?.name) ??
    null;

  const previewUrl = parsedTicketDigits
    ? buildFrontendUrl(parsedTicketDigits, target)
    : "Enter a valid BAM ticket to preview the URL";

  return (
    <>
      <Card className="overflow-hidden border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={target === "admin" ? "secondary" : "outline"}>
              {TARGET_META[target].shortLabel}
            </Badge>
            <Badge variant="outline">{TARGET_META[target].repoSlug}</Badge>
            {parsedTicketDigits === validation.ticketDigits ? (
              <Badge variant="success">Matches backend ticket</Badge>
            ) : (
              <Badge variant="warning">Custom frontend ticket</Badge>
            )}
          </div>
          <CardTitle className="text-xl">{TARGET_META[target].label}</CardTitle>
          <CardDescription>{TARGET_META[target].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor={`${target}-ticket`}
                className="text-sm font-medium text-foreground"
              >
                Ticket Number
              </label>
              <Input
                id={`${target}-ticket`}
                aria-label={`${TARGET_META[target].label} ticket number`}
                value={targetState.ticketDigits}
                onChange={(event) => setTargetTicketDigits(target, event.target.value)}
                placeholder={validation.ticketDigits}
              />
              <p className="text-xs text-muted-foreground">
                Defaults to backend ticket {validation.ticketDigits}, but can be different.
              </p>
              {!parsedTicketDigits ? (
                <p className="text-xs text-destructive">
                  Enter plain digits like 8107 so branch discovery can run.
                </p>
              ) : null}
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-secondary/35 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                URL Preview
              </p>
              <p className="mt-2 break-all text-sm font-medium">{previewUrl}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={`Search ${TARGET_META[target].shortLabel} branches`}
                className="pl-10"
                placeholder={`Search ${TARGET_META[target].shortLabel.toLowerCase()} branches...`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={!parsedTicketDigits}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(true)}
              disabled={!parsedTicketDigits}
            >
              <GitBranch className="size-4" />
              Create Branch from develop
            </Button>
          </div>

          {branchesQuery.isLoading ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-3 py-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : branchesQuery.isError ? (
            <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/5 p-5">
              <p className="font-medium">Unable to load branches</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {branchesQuery.error instanceof Error
                  ? branchesQuery.error.message
                  : "Unknown branch lookup error."}
              </p>
              <Button className="mt-4" variant="destructive" onClick={() => void branchesQuery.refetch()}>
                Retry branch lookup
              </Button>
            </div>
          ) : !parsedTicketDigits ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              Enter a valid ticket to unlock branch discovery for this target.
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center">
                <EmptyStateIllustration />
                <p className="mt-6 font-display text-lg font-semibold">No matching branches yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  No {TARGET_META[target].shortLabel.toLowerCase()} branches matched {branchToken}. Create{" "}
                  <span className="font-medium text-foreground">{`deploy-${branchToken}`}</span>{" "}
                  from develop to continue.
                </p>
                <Button className="mt-5" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="size-4" />
                  Create deploy branch
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-[1.6rem] border border-border/70 bg-background/70 p-4">
              {filteredBranches.length > 1 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select matching branch</p>
                  <Select
                    value={selectedBranch?.name ?? ""}
                    onValueChange={(value) => {
                      const branch =
                        branchesQuery.data?.find((entry) => entry.name === value) ?? null;
                      setSelectedBranch(target, branch);
                    }}
                  >
                    <SelectTrigger aria-label={`${TARGET_META[target].label} branch selection`}>
                      <SelectValue placeholder="Choose a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBranches.map((branch) => (
                        <SelectItem key={branch.name} value={branch.name}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Multiple matches were found. Confirm with the developer if you are unsure.
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {filteredBranches.map((branch) => {
                  const isSelected = selectedBranch?.name === branch.name;

                  return (
                    <motion.button
                      key={branch.name}
                      type="button"
                      whileTap={{ scale: 0.995 }}
                      onClick={() => setSelectedBranch(target, branch)}
                      className={`w-full rounded-[1.4rem] border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-primary/30 bg-primary/5"
                          : "border-border/70 bg-secondary/25 hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{branch.name}</p>
                        {branchesQuery.data?.length === 1 ? (
                          <Badge variant="success">Recommended</Badge>
                        ) : null}
                        {isSelected ? <Badge variant="secondary">Selected</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{branch.message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>Commit {branch.sha.slice(0, 7)}</span>
                        <span>Updated {formatRelativeMinutes(branch.updatedAt)}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryLine label="Ticket" value={parsedTicketDigits ? branchToken : "Waiting for valid digits"} />
            <SummaryLine
              label="Selected Branch"
              value={selectedBranch?.name ?? `deploy-${branchToken}`}
            />
            <SummaryLine label="Deploy URL Preview" value={previewUrl} link={parsedTicketDigits ? previewUrl : undefined} />
          </div>
        </CardContent>
      </Card>

      {parsedTicketDigits ? (
        <CreateBranchModal
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          target={target}
          ticketDigits={parsedTicketDigits}
          branchToken={branchToken}
          onCreated={(branch) => {
            queryClient.setQueryData<BranchRecord[]>(
              ["branches", target, parsedTicketDigits],
              (current) => [branch, ...(current ?? []).filter((entry) => entry.name !== branch.name)],
            );
            setCreatedBranch(target, branch);
          }}
        />
      ) : null}
    </>
  );
}

function SummaryLine({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-secondary/35 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 break-all text-sm font-medium">{value}</p>
        {link ? (
          <Button asChild size="icon" variant="ghost" className="h-8 w-8 shrink-0">
            <a href={link} target="_blank" rel="noreferrer" aria-label={`Open ${label}`}>
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
