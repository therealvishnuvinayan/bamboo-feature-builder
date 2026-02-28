"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  HelpCircle,
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Workflow,
} from "lucide-react";

import { BambooLogoMark } from "@/components/shared/bamboo-logo";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", href: "/", icon: Gauge },
  { label: "Feature Env Builder", href: "/tech/feature-env", icon: LayoutTemplate },
  { label: "Runs", href: "/runs", icon: Workflow },
  { label: "Settings", href: "/settings", icon: Settings2 },
  { label: "Help", href: "/help", icon: HelpCircle },
];

export function AppSidebar({
  collapsed,
  onToggle,
  mobile = false,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-white/20 bg-white/75 px-4 py-5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60",
        collapsed && !mobile ? "w-[96px]" : "w-[284px]",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-2">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Go to dashboard"
          className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <BambooLogoMark className="h-11 w-11 rounded-2xl" />
          {!collapsed || mobile ? (
            <div>
              <p className="font-display text-base font-semibold">Bamboo</p>
              <p className="text-xs text-muted-foreground">Feature Builder</p>
            </div>
          ) : null}
        </Link>
        {!mobile ? (
          <Button aria-label="Toggle sidebar" size="icon" variant="ghost" onClick={onToggle}>
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        ) : null}
      </div>

      <div className="mt-8 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          const link = (
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                active
                  ? "bg-slate-950 text-white shadow-lg dark:bg-white dark:text-slate-950"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                collapsed && !mobile ? "justify-center px-2" : "",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed || mobile ? <span>{item.label}</span> : null}
            </Link>
          );

          if (!collapsed || mobile) {
            return <div key={item.href}>{link}</div>;
          }

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-auto rounded-[1.6rem] border border-white/30 bg-gradient-to-br from-sky-500/12 via-white/50 to-teal-400/10 p-4 dark:border-white/10 dark:from-sky-500/10 dark:via-white/5 dark:to-teal-400/10">
        {!collapsed || mobile ? (
          <>
            <p className="font-display text-sm font-semibold">Environment Delivery</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Validate the backend, deploy Admin and Client targets, and track every run from one workspace.
            </p>
          </>
        ) : (
          <div className="flex justify-center">
            <BambooLogoMark className="h-11 w-11 rounded-2xl" />
          </div>
        )}
      </div>
    </div>
  );
}
