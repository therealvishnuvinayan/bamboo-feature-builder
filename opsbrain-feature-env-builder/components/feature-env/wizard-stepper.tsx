"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const steps = [
  {
    id: 1,
    title: "Backend Validation",
    description: "Parse Swagger or ticket input and verify API health.",
  },
  {
    id: 2,
    title: "Frontend Targets",
    description: "Choose Admin, Client, or both, then resolve the correct branches.",
  },
  {
    id: 3,
    title: "Deploy & Status",
    description: "Dispatch the frontend workflow and monitor progress.",
  },
] as const;

export function WizardStepper({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  return (
    <div className="glass-panel-subtle rounded-[1.8rem] p-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => {
          const isActive = activeStep === step.id;
          const isComplete = activeStep > step.id;

          return (
            <div key={step.id} className="relative">
              {index < steps.length - 1 ? (
                <div className="absolute left-8 top-8 hidden h-px w-[calc(100%-2rem)] bg-border lg:block" />
              ) : null}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  "relative rounded-[1.5rem] border p-4 transition-all",
                  isActive
                    ? "border-primary/30 bg-primary/5 shadow-soft"
                    : "border-border/80 bg-background/55",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
                      isComplete
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : isActive
                          ? "border-primary/30 bg-primary text-primary-foreground"
                          : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {isComplete ? <Check className="size-5" /> : step.id}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
