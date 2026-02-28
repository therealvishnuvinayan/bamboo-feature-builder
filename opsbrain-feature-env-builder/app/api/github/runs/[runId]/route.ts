import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, handleRouteError } from "@/lib/api-utils";
import { getWorkflowRunDetailsDemo } from "@/lib/demo-mode";
import { getWorkflowRun, isDemoMode, listJobsForRun } from "@/lib/github";
import type { WorkflowRunDetailsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const targetSchema = z.enum(["admin", "client"]);

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      runId: string;
    }>;
  },
) {
  try {
    const url = new URL(request.url);
    const target = targetSchema.parse(url.searchParams.get("target") ?? "admin");
    const { runId } = await context.params;
    const numericRunId = Number(runId);

    if (!Number.isFinite(numericRunId)) {
      return errorResponse(400, "INVALID_RUN_ID", "Run id must be numeric.");
    }

    if (isDemoMode()) {
      const result = await getWorkflowRunDetailsDemo(target, numericRunId);
      if (!result) {
        return errorResponse(404, "RUN_NOT_FOUND", "Run not found.");
      }

      return NextResponse.json(result);
    }

    const [run, jobs] = await Promise.all([
      getWorkflowRun(target, numericRunId),
      listJobsForRun(target, numericRunId),
    ]);
    const payload: WorkflowRunDetailsResponse = {
      run,
      jobs,
    };

    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
