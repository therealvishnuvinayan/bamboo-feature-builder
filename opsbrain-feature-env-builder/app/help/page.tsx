import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  HeartPulse,
  LifeBuoy,
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const flowSteps = [
  {
    title: "1. Validate the backend",
    text: "Enter a BAM ticket number or the Swagger URL. The app derives the backend host, API URL, health URL, and Swagger URL, then checks that the backend is reachable.",
    icon: HeartPulse,
  },
  {
    title: "2. Choose frontend targets",
    text: "Select Admin, Client, or both. For each selected target, confirm the BAM ticket, find the correct branch, or create a new branch from develop.",
    icon: MonitorSmartphone,
  },
  {
    title: "3. Deploy and monitor",
    text: "The app dispatches the GitHub workflow for each selected target, finds the latest workflow run, and keeps polling until each run finishes.",
    icon: Workflow,
  },
  {
    title: "4. Share the links",
    text: "When deployment finishes, copy the final Admin URL, Client URL, Swagger URL, and health URL and send them to QA or the wider team.",
    icon: Sparkles,
  },
] as const;

const targetRows = [
  {
    target: "Admin portal",
    repo: "bamboo-card/bamboo-admin-frontend",
    ticketRule: "Can match the backend BAM ticket or be different.",
    branchRule: "Branch name must contain BAM-<digits>.",
    finalUrl: "https://admin-bam-<digits>.dev2.bamboocardportal.com/",
  },
  {
    target: "Client portal",
    repo: "bamboo-card/bamboo_card_front",
    ticketRule: "Can match the backend BAM ticket or be different.",
    branchRule: "Branch name must contain BAM-<digits>.",
    finalUrl: "https://bam-<digits>.dev2.bamboocardportal.com/",
  },
] as const;

const doItems = [
  "Use plain BAM digits such as 8107, or paste the full Swagger URL.",
  "Keep BAM-<digits> in every frontend branch name.",
  "Use the same BAM digits for Admin and Client only when both frontends belong to the same work item.",
  "Create a new deploy branch from develop if no matching branch exists.",
  "Check the run logs if one target fails while the other succeeds.",
] as const;

const doNotItems = [
  "Do not expect this tool to deploy the backend. The backend must already be live.",
  "Do not remove the BAM token from the branch name. The frontend workflow depends on it.",
  "Do not guess between multiple matching branches. Confirm with the developer if needed.",
  "Do not use a branch from the wrong repository for the selected target.",
  "Do not treat Admin and Client as linked by default. Each target deploys and succeeds or fails independently.",
] as const;

const examples = [
  {
    title: "Admin only",
    description:
      "Use this when the work only affects the internal admin portal. Validate the backend once, select Admin, choose the Admin BAM branch, and deploy only that target.",
  },
  {
    title: "Client only",
    description:
      "Use this when the work only affects the customer-facing client portal. Validate the backend, select Client, confirm the Client BAM branch, and deploy that target by itself.",
  },
  {
    title: "Both Admin and Client",
    description:
      "Use this when QA needs to test both portals against the same backend. Select both targets, confirm each BAM ticket and branch, then deploy both and watch both timelines separately.",
  },
] as const;

const failureSteps = [
  "If backend validation fails, check that the BAM ticket is correct and the backend is already deployed.",
  "If no branch is found, create a new branch from develop and make sure the branch name contains BAM-<digits>.",
  "If multiple branches are found, choose the correct one with the developer instead of guessing.",
  "If a workflow fails, open the GitHub logs from the deployment card, fix the branch issue, and retry only the failed target.",
  "If Admin succeeds and Client fails, or the other way around, treat them separately. A partial success is still valid and visible in the final result.",
] as const;

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-white/80 via-white/60 to-sky-500/10 dark:from-slate-950/70 dark:via-slate-950/55 dark:to-sky-500/10">
          <CardContent className="space-y-6 p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Help</Badge>
              <Badge variant="outline">Full Process Guide</Badge>
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight lg:text-5xl">
                How to use Bamboo Feature Builder from start to finish.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                This page explains what the tool does, which inputs to use, how Admin and Client deployments work, and what to do when something fails.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/tech/feature-env">
                  Open Feature Env Builder
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/settings">Open Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              In One Sentence
            </Badge>
            <CardTitle className="text-2xl">What this tool is for</CardTitle>
            <CardDescription>
              A simple workflow for QA to validate the backend and deploy the required frontend targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoLine
              label="Backend"
              value="Already deployed. This tool only checks that it is live."
            />
            <InfoLine
              label="Frontend"
              value="Deploy Admin, Client, or both by selecting branches and dispatching GitHub workflows."
            />
            <InfoLine
              label="Output"
              value="Final URLs for Swagger, health-check, Admin, and Client, plus live workflow status."
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            End-To-End Flow
          </Badge>
          <CardTitle className="text-2xl">The full process</CardTitle>
          <CardDescription>
            Read this section if you want the complete sequence in plain English.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-4">
            {flowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="relative">
                  {index < flowSteps.length - 1 ? (
                    <div className="absolute right-[-12px] top-12 hidden xl:block">
                      <ArrowRight className="size-5 text-muted-foreground" />
                    </div>
                  ) : null}
                  <div className="h-full rounded-[1.6rem] border border-border/70 bg-background/70 p-5">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <p className="mt-4 font-display text-xl font-semibold">{step.title}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Step 1
            </Badge>
            <CardTitle className="text-2xl">Backend validation</CardTitle>
            <CardDescription>
              This step is the gate. You cannot continue until the backend is reachable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HelpBullet text="You can enter plain BAM digits such as 8107." />
            <HelpBullet text="You can also paste the full Swagger URL for that BAM ticket." />
            <HelpBullet text="The app extracts the BAM digits and builds the backend host, API base URL, health URL, and Swagger URL automatically." />
            <HelpBullet text="It checks the health endpoint first. If that fails, it tries Swagger reachability as a fallback." />
            <HelpBullet text="When Step 1 succeeds, the backend is treated as ready and the app unlocks frontend target selection." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Important Rule
            </Badge>
            <CardTitle className="text-2xl">The backend is not deployed here</CardTitle>
            <CardDescription>
              This point is important for everyone on the team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="font-medium">This tool only validates the backend.</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    If the backend BAM environment is not already live, frontend deployment can still run, but QA will not get a working full environment. Make sure the backend exists before you continue.
                  </p>
                </div>
              </div>
            </div>
            <InfoLine
              label="Swagger example"
              value="https://bamboo-api-bam-8107.dev2.bamboocardportal.com/swagger/index.html"
            />
            <InfoLine
              label="Health endpoint"
              value="https://bamboo-api-bam-8107.dev2.bamboocardportal.com/api/helper/health-check"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Step 2
          </Badge>
          <CardTitle className="text-2xl">Frontend targets and BAM ticket rules</CardTitle>
          <CardDescription>
            Admin and Client can use the same BAM digits as the backend, or different ones, depending on the work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            {targetRows.map((row) => (
              <div key={row.target} className="rounded-[1.6rem] border border-border/70 bg-background/70 p-5">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MonitorSmartphone className="size-5" />
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold">{row.target}</p>
                    <p className="text-sm text-muted-foreground">{row.repo}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <InfoLine label="Ticket rule" value={row.ticketRule} />
                  <InfoLine label="Branch rule" value={row.branchRule} />
                  <InfoLine label="Final URL" value={row.finalUrl} />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-[1.6rem] border border-border/70 bg-secondary/35 p-5">
            <p className="font-medium">What happens in Step 2</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <HelpBullet text="Select Admin, Client, or both." />
              <HelpBullet text="For each selected target, confirm the BAM digits." />
              <HelpBullet text="The app searches branches that contain BAM-<digits>." />
              <HelpBullet text="If one branch matches, it is selected automatically." />
              <HelpBullet text="If several branches match, choose the right one." />
              <HelpBullet text="If no branch matches, create deploy-BAM-<digits> from develop." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Step 3
          </Badge>
          <CardTitle className="text-2xl">Deployment and status tracking</CardTitle>
          <CardDescription>
            Each selected target is deployed independently and tracked independently.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[1.6rem] border border-border/70 bg-background/70 p-5">
            <p className="font-medium">What the app does after you click Deploy</p>
            <div className="mt-4 space-y-3">
              <HelpBullet text="Dispatch the deploy-feature.yml GitHub workflow for each selected target." />
              <HelpBullet text="Look up the newest workflow run for that branch in that repository." />
              <HelpBullet text="Poll the run and jobs until the workflow finishes." />
              <HelpBullet text="Show a separate timeline and status for Admin and Client." />
              <HelpBullet text="Show the final links once the target completes successfully." />
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-border/70 bg-background/70 p-5">
            <p className="font-medium">What success and failure mean</p>
            <div className="mt-4 space-y-3">
              <HelpBullet text="If both targets succeed, the page shows both final frontend URLs." />
              <HelpBullet text="If only one target succeeds, the page shows a partial success and keeps the failed target separate." />
              <HelpBullet text="If one target fails, you can retry only that target." />
              <HelpBullet text="The Runs page keeps the tracked history so the team can revisit recent deployments." />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Do
            </Badge>
            <CardTitle className="text-2xl">What the team should do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doItems.map((item) => (
              <ChecklistItem key={item} tone="success" text={item} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Do Not
            </Badge>
            <CardTitle className="text-2xl">What the team should avoid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doNotItems.map((item) => (
              <ChecklistItem key={item} tone="warning" text={item} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Common Cases
          </Badge>
          <CardTitle className="text-2xl">When to choose Admin, Client, or both</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-3">
          {examples.map((example) => (
            <div key={example.title} className="rounded-[1.6rem] border border-border/70 bg-background/70 p-5">
              <p className="font-display text-xl font-semibold">{example.title}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {example.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              If Something Fails
            </Badge>
            <CardTitle className="text-2xl">What to check first</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {failureSteps.map((step) => (
              <HelpBullet key={step} text={step} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Support
            </Badge>
            <CardTitle className="text-2xl">Useful pages in this app</CardTitle>
            <CardDescription>
              Use these pages when you need configuration details or a deployment history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LinkCard
              href="/tech/feature-env"
              title="Feature Env Builder"
              text="Start a backend validation, pick targets, create branches, and deploy."
              icon={Rocket}
            />
            <LinkCard
              href="/runs"
              title="Runs"
              text="Review the latest tracked deployments and open workflow logs."
              icon={GitBranch}
            />
            <LinkCard
              href="/settings"
              title="Settings"
              text="Check repository configuration, workflow ids, and GitHub connectivity."
              icon={ShieldCheck}
            />
            <div className="rounded-[1.6rem] border border-primary/10 bg-gradient-to-br from-sky-500/10 via-background to-teal-400/10 p-5">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <LifeBuoy className="size-5" />
                </div>
                <div>
                  <p className="font-medium">When to ask for help</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Ask a developer when you see multiple similar branches, the workflow fails repeatedly, or the BAM ticket mapping between backend, Admin, and Client is unclear.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-secondary/30 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-medium">{value}</p>
    </div>
  );
}

function HelpBullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[1.35rem] border border-border/70 bg-background/70 p-4">
      <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="size-4" />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function ChecklistItem({
  text,
  tone,
}: {
  text: string;
  tone: "success" | "warning";
}) {
  const iconClasses =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-300";

  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div className="flex items-start gap-3 rounded-[1.35rem] border border-border/70 bg-background/70 p-4">
      <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClasses}`}>
        <Icon className="size-4" />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function LinkCard({
  href,
  title,
  text,
  icon: Icon,
}: {
  href: string;
  title: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[1.6rem] border border-border/70 bg-background/70 p-5 transition-colors hover:bg-secondary/35"
    >
      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">{title}</p>
            <ArrowRight className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
        </div>
      </div>
    </Link>
  );
}
