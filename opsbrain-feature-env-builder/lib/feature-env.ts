import type { RepoTarget } from "@/lib/types";

export type ParsedBackendInput = {
  ticketDigits: string;
  branchToken: string;
  canonicalTicket: string;
  backendHost: string;
  apiBaseUrl: string;
  healthUrl: string;
  swaggerUrl: string;
};

const URL_TICKET_PATTERN = /bamboo-api-bam-(\d{3,6})/i;
const PLAIN_TICKET_PATTERN = /^(?:bam-)?(\d{3,6})$/i;
const BRANCH_TOKEN_PATTERN = /\bBAM-(\d{3,6})\b/i;

export const REPO_TARGETS = ["admin", "client"] as const;

export const TARGET_META: Record<
  RepoTarget,
  {
    label: string;
    shortLabel: string;
    repoSlug: string;
    description: string;
  }
> = {
  admin: {
    label: "Admin Portal",
    shortLabel: "Admin",
    repoSlug: "bamboo-card/bamboo-admin-frontend",
    description: "Deploy the internal Bamboo admin frontend.",
  },
  client: {
    label: "Client Portal",
    shortLabel: "Client",
    repoSlug: "bamboo-card/bamboo_card_front",
    description: "Deploy the Bamboo client-facing frontend.",
  },
};

export function extractTicketDigits(rawValue: string) {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const urlMatch = value.match(URL_TICKET_PATTERN);
  const plainMatch = value.match(PLAIN_TICKET_PATTERN);
  const branchMatch = value.match(BRANCH_TOKEN_PATTERN);

  return urlMatch?.[1] ?? plainMatch?.[1] ?? branchMatch?.[1] ?? null;
}

export function toBranchToken(ticketDigits: string) {
  return `BAM-${ticketDigits}`;
}

export function toCanonicalTicket(ticketDigits: string) {
  return `bam-${ticketDigits}`;
}

export function buildBackendUrls(ticketDigits: string) {
  const canonicalTicket = toCanonicalTicket(ticketDigits);
  const backendHost = `https://bamboo-api-${canonicalTicket}.dev2.bamboocardportal.com`;
  const apiBaseUrl = `${backendHost}/api/`;
  const healthUrl = `${apiBaseUrl}helper/health-check`;
  const swaggerUrl = `${backendHost}/swagger/index.html`;

  return {
    backendHost,
    apiBaseUrl,
    healthUrl,
    swaggerUrl,
  };
}

export function parseBackendInput(rawValue: string): ParsedBackendInput | null {
  const ticketDigits = extractTicketDigits(rawValue);
  if (!ticketDigits) {
    return null;
  }

  const branchToken = toBranchToken(ticketDigits);
  const canonicalTicket = toCanonicalTicket(ticketDigits);
  const { backendHost, apiBaseUrl, healthUrl, swaggerUrl } = buildBackendUrls(ticketDigits);

  return {
    ticketDigits,
    branchToken,
    canonicalTicket,
    backendHost,
    apiBaseUrl,
    healthUrl,
    swaggerUrl,
  };
}

export function buildFrontendUrl(ticketOrDigits: string, target: RepoTarget = "admin") {
  const ticketDigits = extractTicketDigits(ticketOrDigits) ?? ticketOrDigits.replace(/^bam-/i, "");
  const canonicalTicket = toCanonicalTicket(ticketDigits);

  if (target === "client") {
    return `https://${canonicalTicket}.dev2.bamboocardportal.com/`;
  }

  return `https://admin-${canonicalTicket}.dev2.bamboocardportal.com/`;
}
