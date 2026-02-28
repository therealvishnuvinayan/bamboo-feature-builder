"use client";

import { LocalAccessGate } from "@/components/auth/local-access-gate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

import { ActivityDrawer } from "@/components/layout/activity-drawer";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { CommandPalette } from "@/components/shared/command-palette";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <LocalAccessGate>
      <TooltipProvider delayDuration={120}>
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen shrink-0 md:block">
            <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
          </aside>

          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="p-0">
              <AppSidebar
                collapsed={false}
                mobile
                onToggle={() => undefined}
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="relative flex min-h-screen flex-1 flex-col">
            <div className="pointer-events-none absolute inset-0 page-grid opacity-30" />
            <TopBar
              onOpenMobileNav={() => setMobileSidebarOpen(true)}
              onOpenPalette={() => setCommandOpen(true)}
              onOpenActivity={() => setActivityOpen(true)}
            />
            <main className="relative flex-1 px-4 py-8 md:px-6 lg:px-8">{children}</main>
          </div>
        </div>
 
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        <ActivityDrawer open={activityOpen} onOpenChange={setActivityOpen} />
      </TooltipProvider>
    </LocalAccessGate>
  );
}
