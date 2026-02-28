"use client";

import { BellRing, Hammer, Rocket, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useEffectEvent, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useWizardStore } from "@/lib/wizard-store";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const triggerCommand = useWizardStore((state) => state.triggerCommand);
  const [search, setSearch] = useState("");

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      onOpenChange(!open);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function runWizardAction(command: "validate" | "branches" | "deploy") {
    router.push("/tech/feature-env");
    triggerCommand(command);
    onOpenChange(false);
  }

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
    onOpenChange(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={search} onValueChange={setSearch} placeholder="Search actions, routes, or quick tools..." />
      <CommandList>
        <CommandEmpty>No matching actions.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runWizardAction("validate")}>
            <Search className="size-4 text-primary" />
            Validate Backend
            <CommandShortcut>Step 1</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runWizardAction("branches")}>
            <Hammer className="size-4 text-primary" />
            Find Branches
            <CommandShortcut>Step 2</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runWizardAction("deploy")}>
            <Rocket className="size-4 text-primary" />
            Deploy
            <CommandShortcut>Step 3</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={toggleTheme}>
            <Sparkles className="size-4 text-primary" />
            Toggle Theme
            <CommandShortcut>Theme</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              router.push("/");
              onOpenChange(false);
            }}
          >
            <BellRing className="size-4 text-primary" />
            Open Dashboard
            <CommandShortcut>Home</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
