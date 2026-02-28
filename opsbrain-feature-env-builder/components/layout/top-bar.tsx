"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LockKeyhole, LogOut, Menu, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { BambooLogoMark } from "@/components/shared/bamboo-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  clearWorkspaceBrowserState,
  LOCAL_ACCESS_QUERY_KEY,
  logoutFromLocalAccess,
} from "@/lib/local-auth";

export function TopBar({
  onOpenMobileNav,
  onOpenPalette,
  onOpenActivity,
}: {
  onOpenMobileNav: () => void;
  onOpenPalette: () => void;
  onOpenActivity: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      await logoutFromLocalAccess();
    } catch {
      // Continue clearing local state even if the server cookie was already missing.
    }

    clearWorkspaceBrowserState();
    queryClient.removeQueries({ queryKey: LOCAL_ACCESS_QUERY_KEY });
    queryClient.clear();
    toast.success("Signed out");
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/20 bg-background/70 backdrop-blur-2xl dark:border-white/10">
      <div className="flex h-20 items-center gap-3 px-4 md:px-6">
        <Button aria-label="Open navigation" variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav}>
          <Menu className="size-5" />
        </Button>

        <button
          type="button"
          onClick={onOpenPalette}
          className="glass-panel-subtle flex h-12 flex-1 items-center gap-3 rounded-full px-4 text-sm text-muted-foreground transition hover:border-primary/20 hover:text-foreground"
        >
          <Search className="size-4" />
          <span className="truncate text-left">Search runs, branches, or quick actions</span>
          <span className="ml-auto hidden rounded-full border border-border px-2.5 py-1 text-xs tracking-widest text-muted-foreground sm:inline-flex">
            Ctrl/⌘ K
          </span>
        </button>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/" aria-label="Go to dashboard">
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-full px-3 py-2 transition hover:border-primary/20 hover:text-foreground"
            >
              <BambooLogoMark className="h-4 w-4 rounded-md shadow-none" />
              <Sparkles className="size-3.5" />
              Bamboo Feature Builder
            </Badge>
          </Link>
        </div>

        <ThemeToggle />

        <Button aria-label="Open activity drawer" variant="outline" size="icon" onClick={onOpenActivity}>
          <Sparkles className="size-4" />
        </Button>

        <Button aria-label="Open notifications" variant="outline" size="icon">
          <Bell className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-12 gap-2 rounded-full px-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback>BQ</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline-flex">Bamboo QA</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Workspace Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Preferences</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/help">Help center</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LockKeyhole className="size-4" />
              Secure access enabled
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleLogout()}>
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
