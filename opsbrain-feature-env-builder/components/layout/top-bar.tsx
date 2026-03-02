"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, HelpCircle, LockKeyhole, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { developerSettingsEnabled } from "@/lib/app-config";
import {
  clearWorkspaceBrowserState,
  LOCAL_ACCESS_QUERY_KEY,
  logoutFromLocalAccess,
} from "@/lib/local-auth";

export function TopBar({
  onOpenMobileNav,
}: {
  onOpenMobileNav: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pageTitle = pathname === "/help" ? "Help Center" : "Feature Environment Builder";

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
        <Button
          aria-label="Open navigation"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMobileNav}
        >
          <Menu className="size-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Bamboo
          </p>
          <Link
            href="/"
            aria-label="Go to feature builder"
            className="mt-1 block truncate font-display text-xl font-semibold tracking-tight transition hover:text-primary"
          >
            {pageTitle}
          </Link>
        </div>

        <Button asChild variant="outline" size="icon">
          <Link href="/help" aria-label="Open help center">
            <HelpCircle className="size-4" />
          </Link>
        </Button>

        <ThemeToggle />

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
              <Link href="/help">Help center</Link>
            </DropdownMenuItem>
            {developerSettingsEnabled ? (
              <DropdownMenuItem asChild>
                <Link href="/settings">Developer settings</Link>
              </DropdownMenuItem>
            ) : null}
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
