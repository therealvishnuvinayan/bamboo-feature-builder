import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, fetchWithTimeout, handleRouteError } from "@/lib/api-utils";
import { validateBackendDemo } from "@/lib/demo-mode";
import { parseBackendInput } from "@/lib/feature-env";
import { isDemoMode } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  input: z.string().trim().min(1, "Input is required."),
});

function isReachableStatus(status: number) {
  return (status >= 200 && status < 400) || status === 401 || status === 403;
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    if (isDemoMode()) {
      return NextResponse.json(await validateBackendDemo(body.input));
    }

    const parsed = parseBackendInput(body.input);
    if (!parsed) {
      return errorResponse(
        400,
        "INVALID_BACKEND_INPUT",
        "Enter a BAM ticket number or a bamboo Swagger URL.",
      );
    }

    const checkedAt = new Date().toISOString();
    console.info(`[backend] validating ${parsed.canonicalTicket}`);

    const healthStartedAt = Date.now();
    try {
      const healthResponse = await fetchWithTimeout(parsed.healthUrl, 5_000);
      const latencyMs = Date.now() - healthStartedAt;

      if (healthResponse.ok) {
        return NextResponse.json({
          ok: true,
          ...parsed,
          status: healthResponse.status,
          latencyMs,
          checkedAt,
          validatedBy: "health",
        });
      }

      const swaggerResponse = await fetchWithTimeout(parsed.swaggerUrl, 5_000);
      if (isReachableStatus(swaggerResponse.status)) {
        return NextResponse.json({
          ok: true,
          ...parsed,
          status: swaggerResponse.status,
          latencyMs,
          checkedAt,
          validatedBy: "swagger",
        });
      }

      return NextResponse.json(
        {
          ok: false,
          ...parsed,
          status: swaggerResponse.status,
          latencyMs,
          checkedAt,
          error: {
            code: "BACKEND_UNAVAILABLE",
            message:
              "Neither health-check nor swagger responded successfully for this BAM ticket.",
          },
        },
        { status: 502 },
      );
    } catch (error) {
      const latencyMs = Date.now() - healthStartedAt;

      try {
        const swaggerResponse = await fetchWithTimeout(parsed.swaggerUrl, 5_000);
        if (isReachableStatus(swaggerResponse.status)) {
          return NextResponse.json({
            ok: true,
            ...parsed,
            status: swaggerResponse.status,
            latencyMs,
            checkedAt,
            validatedBy: "swagger",
          });
        }
      } catch {
        // Ignore secondary swagger probe failure and return the original timeout/network error.
      }

      return NextResponse.json(
        {
          ok: false,
          ...parsed,
          status: 502,
          latencyMs,
          checkedAt,
          error: {
            code: "BACKEND_UNAVAILABLE",
            message:
              error instanceof Error
                ? error.message
                : "Unable to reach the backend health-check or swagger URL.",
          },
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
