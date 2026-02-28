"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TARGET_META } from "@/lib/feature-env";
import { createBranch } from "@/lib/mockApi";
import type { BranchRecord, RepoTarget } from "@/lib/types";

function branchSchema(branchToken: string) {
  return z.object({
    base: z.string().min(1, "Choose a base branch."),
    name: z
      .string()
      .trim()
      .min(1, "Enter a branch name.")
      .refine((value) => value.toUpperCase().includes(branchToken), {
        message: `Branch name must include ${branchToken}.`,
      }),
  });
}

export function CreateBranchModal({
  open,
  onOpenChange,
  target,
  ticketDigits,
  branchToken,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  target: RepoTarget;
  ticketDigits: string;
  branchToken: string;
  onCreated: (branch: BranchRecord) => void;
}) {
  const schema = branchSchema(branchToken);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      base: "develop",
      name: `deploy-${branchToken}`,
    },
  });

  useEffect(() => {
    form.reset({
      base: "develop",
      name: `deploy-${branchToken}`,
    });
  }, [branchToken, form]);

  const mutation = useMutation({
    mutationFn: ({ base, name }: z.infer<typeof schema>) =>
      createBranch({ target, base, name, ticketDigits }),
    onSuccess: (branch) => {
      toast.success(`Created ${branch.name}`);
      onCreated(branch);
      onOpenChange(false);
    },
    onError: () => toast.error("Unable to create branch."),
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    await mutation.mutateAsync(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create frontend branch</DialogTitle>
          <DialogDescription>
            Start from a stable base and generate a deploy-friendly branch name for{" "}
            {TARGET_META[target].label} using {branchToken}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="base-branch">Base branch</Label>
            <Select defaultValue={form.getValues("base")} onValueChange={(value) => form.setValue("base", value)}>
              <SelectTrigger id="base-branch" aria-label="Base branch">
                <SelectValue placeholder="Select a base branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="develop">develop</SelectItem>
                <SelectItem value="release">release</SelectItem>
                <SelectItem value="main">main</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.base ? (
              <p className="text-sm text-destructive">{form.formState.errors.base.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch-name">New branch name</Label>
            <Input id="branch-name" aria-label="New branch name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-secondary/40 p-4 text-sm">
            <p className="font-medium">Naming rules preview</p>
            <p className="mt-2 text-muted-foreground">
              Keep the branch deploy-friendly, lowercase prefixes are fine, but it must contain{" "}
              <span className="font-medium text-foreground">{branchToken}</span>.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Create Branch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
