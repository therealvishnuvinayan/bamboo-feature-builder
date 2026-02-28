"use client";

import { create } from "zustand";

import type {
  BackendValidationResult,
  BranchRecord,
  DeploymentRun,
  FrontendTargetState,
  RepoTarget,
} from "@/lib/types";

export type WizardCommand = "validate" | "branches" | "deploy";

type WizardState = {
  activeStep: 1 | 2 | 3;
  backendInput: string;
  validation: BackendValidationResult | null;
  targets: Record<RepoTarget, FrontendTargetState>;
  commandCounters: Record<WizardCommand, number>;
  setActiveStep: (step: 1 | 2 | 3) => void;
  setBackendInput: (value: string) => void;
  setValidation: (value: BackendValidationResult | null) => void;
  setTargetEnabled: (target: RepoTarget, enabled: boolean) => void;
  setTargetTicketDigits: (target: RepoTarget, value: string) => void;
  setSelectedBranch: (target: RepoTarget, value: BranchRecord | null) => void;
  setCreatedBranch: (target: RepoTarget, value: BranchRecord | null) => void;
  setCurrentRun: (target: RepoTarget, value: DeploymentRun | null) => void;
  triggerCommand: (command: WizardCommand) => void;
  reset: () => void;
};

function createTargetState(ticketDigits = "8107"): Record<RepoTarget, FrontendTargetState> {
  return {
    admin: {
      enabled: true,
      ticketDigits,
      selectedBranch: null,
      createdBranch: null,
      currentRun: null,
    },
    client: {
      enabled: true,
      ticketDigits,
      selectedBranch: null,
      createdBranch: null,
      currentRun: null,
    },
  };
}

export const useWizardStore = create<WizardState>((set) => ({
  activeStep: 1,
  backendInput: "8107",
  validation: null,
  targets: createTargetState(),
  commandCounters: {
    validate: 0,
    branches: 0,
    deploy: 0,
  },
  setActiveStep: (step) => set({ activeStep: step }),
  setBackendInput: (value) => set({ backendInput: value }),
  setValidation: (value) =>
    set((state) => ({
      validation: value,
      targets: {
        admin: {
          ...state.targets.admin,
          ticketDigits: value?.ticketDigits ?? state.targets.admin.ticketDigits,
          selectedBranch: null,
          createdBranch: null,
          currentRun: null,
        },
        client: {
          ...state.targets.client,
          ticketDigits: value?.ticketDigits ?? state.targets.client.ticketDigits,
          selectedBranch: null,
          createdBranch: null,
          currentRun: null,
        },
      },
    })),
  setTargetEnabled: (target, enabled) =>
    set((state) => ({
      targets: {
        ...state.targets,
        [target]: {
          ...state.targets[target],
          enabled,
        },
      },
    })),
  setTargetTicketDigits: (target, value) =>
    set((state) => ({
      targets: {
        ...state.targets,
        [target]: {
          ...state.targets[target],
          ticketDigits: value,
          selectedBranch: null,
          createdBranch: null,
          currentRun: null,
        },
      },
    })),
  setSelectedBranch: (target, value) =>
    set((state) => ({
      targets: {
        ...state.targets,
        [target]: {
          ...state.targets[target],
          selectedBranch: value,
        },
      },
    })),
  setCreatedBranch: (target, value) =>
    set((state) => ({
      targets: {
        ...state.targets,
        [target]: {
          ...state.targets[target],
          createdBranch: value,
          selectedBranch: value,
        },
      },
    })),
  setCurrentRun: (target, value) =>
    set((state) => ({
      targets: {
        ...state.targets,
        [target]: {
          ...state.targets[target],
          currentRun: value,
        },
      },
    })),
  triggerCommand: (command) =>
    set((state) => ({
      activeStep: command === "validate" ? 1 : command === "branches" ? 2 : 3,
      commandCounters: {
        ...state.commandCounters,
        [command]: state.commandCounters[command] + 1,
      },
    })),
  reset: () =>
    set({
      activeStep: 1,
      backendInput: "8107",
      validation: null,
      targets: createTargetState(),
      commandCounters: {
        validate: 0,
        branches: 0,
        deploy: 0,
      },
    }),
}));
