import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, handleRouteError } from "@/lib/api-utils";
import { dispatchWorkflowDemo } from "@/lib/demo-mode";
import { extractTicketDigits, toBranchToken } from "@/lib/feature-env";
import { dispatchWorkflow, isDemoMode } from "@/lib/github";
import type { WorkflowDispatchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  target: z.enum(["admin", "client"]),
  ref: z.string().trim().min(1),
  ticketDigits: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const target = body.target;
    const ticketDigits = extractTicketDigits(body.ticketDigits);

    if (!ticketDigits) {
      return errorResponse(400, "INVALID_TICKET_DIGITS", "Provide a numeric BAM ticket value.");
    }

    const branchToken = toBranchToken(ticketDigits);
    if (!body.ref.toUpperCase().includes(branchToken)) {
      return errorResponse(
        400,
        "INVALID_REF",
        `The branch ref must contain ${branchToken} so the frontend workflow can derive the ticket.`,
      );
    }

    if (isDemoMode()) {
      return NextResponse.json(
        await dispatchWorkflowDemo({
          target,
          ref: body.ref,
          ticketDigits,
        }),
      );
    }

    console.info(`[workflow:${target}] dispatching deploy-feature for ${body.ref}`);
    await dispatchWorkflow(target, body.ref);

    const response: WorkflowDispatchResponse = {
      ok: true,
      target,
      dispatchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleRouteError(error);
  }
}
