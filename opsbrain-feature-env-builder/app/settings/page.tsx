"use client";

import { useState } from "react";
import { Bell, GitBranch, MoonStar, ShieldCheck } from "lucide-react";

import { DeveloperPanel } from "@/components/settings/developer-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [defaultBaseBranch, setDefaultBaseBranch] = useState("develop");
  const [notifySlack, setNotifySlack] = useState(true);

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Settings
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Workspace preferences</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Workspace preferences, runtime diagnostics, and repository connectivity controls for the Bamboo Feature Builder.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          icon={<GitBranch className="size-5" />}
          title="Default branch strategy"
          description="Pre-fill new feature environment branches from a preferred base branch."
        >
          <Input value={defaultBaseBranch} onChange={(event) => setDefaultBaseBranch(event.target.value)} />
        </SettingsCard>

        <SettingsCard
          icon={<Bell className="size-5" />}
          title="Run alerts"
          description="Decide whether completed deployments should trigger downstream notifications."
        >
          <div className="flex items-center justify-between rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Slack notifications</p>
              <p className="text-xs text-muted-foreground">Use this workspace preference to control post-deploy alerts.</p>
            </div>
            <Button variant={notifySlack ? "default" : "outline"} onClick={() => setNotifySlack((value) => !value)}>
              {notifySlack ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<MoonStar className="size-5" />}
          title="Theme behavior"
          description="Theme switching is controlled globally through next-themes."
        >
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
            Use the theme toggle in the top bar to switch between light, dark, or system mode.
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<ShieldCheck className="size-5" />}
          title="Validation safeguards"
          description="Backend validation runs server-side with strict BAM parsing, health-check probing, and swagger fallback."
        >
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
            Both frontend repos require branches containing <span className="font-medium text-foreground">BAM-####</span> because each deploy workflow derives the canonical ticket from the branch name.
          </div>
        </SettingsCard>

        <DeveloperPanel />
      </div>
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
