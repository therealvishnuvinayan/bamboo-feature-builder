import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { GithubApiError } from "@/lib/github";
import type { ApiErrorPayload } from "@/lib/types";

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const payload: ApiErrorPayload = {
    ok: false,
    error: {
      code,
      message,
      details,
    },
  };

  return NextResponse.json(payload, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof GithubApiError) {
    console.error(`[api] ${error.code}: ${error.message}`, error.details ?? "");
    return errorResponse(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return errorResponse(400, "INVALID_REQUEST", "The request payload is invalid.", error.flatten());
  }

  const message = error instanceof Error ? error.message : "Unknown server error.";
  console.error("[api] INTERNAL_ERROR:", message);
  return errorResponse(500, "INTERNAL_ERROR", message);
}

export async function fetchWithTimeout(input: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
