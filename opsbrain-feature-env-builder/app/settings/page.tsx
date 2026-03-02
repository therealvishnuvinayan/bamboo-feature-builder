import { notFound } from "next/navigation";

import { DeveloperPanel } from "@/components/settings/developer-panel";
import { Badge } from "@/components/ui/badge";
import { isDeveloperSettingsEnabled } from "@/lib/app-config";

export default function SettingsPage() {
  if (!isDeveloperSettingsEnabled()) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Badge variant="secondary" className="w-fit">
          Developer Settings
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Developer tools
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Repository configuration and connectivity checks for Bamboo Feature Builder.
        </p>
      </div>

      <DeveloperPanel />
    </div>
  );
}
