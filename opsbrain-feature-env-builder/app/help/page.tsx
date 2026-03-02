import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  HeartPulse,
  MonitorSmartphone,
  Rocket,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const flow = [
  {
    title: "Step 1. Validate the backend",
    text: "Enter the BAM ticket digits or paste the backend Swagger URL. The app extracts the BAM ticket, builds the backend links, and checks that the backend is reachable.",
    icon: HeartPulse,
  },
  {
    title: "Step 2. Choose the frontend target",
    text: "Select Admin, Client, or both. For each selected target, confirm the BAM ticket, find the correct branch, or create a new deploy branch from develop.",
    icon: MonitorSmartphone,
  },
  {
    title: "Step 3. Deploy and share",
    text: "Start the deployment, watch the GitHub workflow timeline, and copy the final frontend and backend links for QA.",
    icon: Rocket,
  },
] as const;

const targetRules = [
  {
    title: "Admin portal",
    repo: "bamboo-card/bamboo-admin-frontend",
    url: "https://admin-bam-<digits>.dev2.bamboocardportal.com/",
  },
  {
    title: "Client portal",
    repo: "bamboo-card/bamboo_card_front",
    url: "https://bam-<digits>.dev2.bamboocardportal.com/",
  },
] as const;

const importantRules = [
  "The backend must already be deployed. This tool only validates that it is live.",
  "Every frontend branch must contain BAM-<digits> in the branch name.",
  "Admin and Client can use the same BAM ticket or different BAM tickets.",
  "If more than one matching branch is found, confirm the correct branch with the developer.",
  "If no branch exists, create a new branch from develop and keep BAM-<digits> in the name.",
] as const;

const doNotDo = [
  "Do not use a branch that belongs to the wrong frontend repository.",
  "Do not remove the BAM token from the branch name.",
  "Do not assume Admin and Client always deploy together. They are separate targets.",
  "Do not continue if the backend validation fails.",
] as const;

const troubleshooting = [
  "If backend validation fails, check that the BAM ticket is correct and the backend is already live.",
  "If branch lookup fails, check that the GitHub token is configured and has access to the repo.",
  "If a deploy starts but the timeline shows an error, open the GitHub run logs and retry only that target.",
  "If one target succeeds and the other fails, share the successful links and retry only the failed target.",
] as const;

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-white/80 via-white/60 to-sky-500/10 dark:from-slate-950/70 dark:via-slate-950/55 dark:to-sky-500/10">
          <CardContent className="space-y-6 p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Help</Badge>
              <Badge variant="outline">Plain English Guide</Badge>
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight lg:text-5xl">
                How Bamboo Feature Builder works
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                This page explains exactly what to enter, what the app does, and what the team should check before sharing links with QA.
              </p>
            </div>
            <Button asChild size="lg" className="w-fit">
              <Link href="/">
                Open Feature Builder
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Summary
            </Badge>
            <CardTitle className="text-2xl">What this tool does</CardTitle>
            <CardDescription>
              One place to validate the backend and deploy the frontend environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              This tool checks whether the backend BAM environment is live, then helps you deploy the
              Admin portal, the Client portal, or both.
            </p>
            <p>
              When deployment finishes, the tool gives you the frontend URL and the backend links you
              need to share with QA.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Main Flow
          </Badge>
          <CardTitle className="text-2xl">The full process</CardTitle>
          <CardDescription>
            Follow these steps in order every time.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-3">
          {flow.map((step) => {
            const Icon = step.icon;

            return (
              <div key={step.title} className="rounded-[1.6rem] border border-border/70 bg-background/70 p-5">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <p className="mt-4 font-display text-xl font-semibold">{step.title}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Frontend Targets
            </Badge>
            <CardTitle className="text-2xl">Admin and Client are separate</CardTitle>
            <CardDescription>
              Each target has its own repository, branch, workflow run, and final URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {targetRules.map((target) => (
              <div key={target.title} className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={target.title === "Admin portal" ? "secondary" : "outline"}>
                    {target.title}
                  </Badge>
                  <GitBranch className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">{target.repo}</p>
                <p className="mt-2 break-all text-sm text-muted-foreground">{target.url}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Important Rules
            </Badge>
            <CardTitle className="text-2xl">What everyone should remember</CardTitle>
            <CardDescription>
              These are the rules that matter most during deployment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {importantRules.map((item) => (
              <HelpLine key={item} icon={<CheckCircle2 className="size-4" />} text={item} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Avoid These
            </Badge>
            <CardTitle className="text-2xl">What not to do</CardTitle>
            <CardDescription>
              These are the common mistakes that usually cause confusion or failed deploys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {doNotDo.map((item) => (
              <HelpLine key={item} icon={<AlertTriangle className="size-4" />} text={item} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              If Something Fails
            </Badge>
            <CardTitle className="text-2xl">Troubleshooting</CardTitle>
            <CardDescription>
              Use this checklist when a validation, branch lookup, or deploy fails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {troubleshooting.map((item) => (
              <HelpLine key={item} icon={<AlertTriangle className="size-4" />} text={item} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HelpLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[1.3rem] border border-border/70 bg-background/70 px-4 py-3">
      <div className="mt-0.5 text-primary">{icon}</div>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
