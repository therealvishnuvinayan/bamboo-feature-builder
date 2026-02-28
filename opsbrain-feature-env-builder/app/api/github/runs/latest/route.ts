import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, handleRouteError } from "@/lib/api-utils";
import { getLatestWorkflowRunDemo } from "@/lib/demo-mode";
import { isDemoMode, listWorkflowRunsForBranch, workflowMatchesConfig } from "@/lib/github";
import type { WorkflowLatestRunResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const targetSchema = z.enum(["admin", "client"]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const target = targetSchema.parse(url.searchParams.get("target") ?? "admin");
    const ref = url.searchParams.get("ref")?.trim();
    const createdAfter = url.searchParams.get("createdAfter");

    if (!ref) {
      return errorResponse(400, "INVALID_REF", "Provide a branch ref.");
    }

    if (isDemoMode()) {
      const run = await getLatestWorkflowRunDemo({ target, ref, createdAfter });
      if (!run) {
        return errorResponse(404, "RUN_NOT_FOUND", "No workflow run found for this branch yet.");
      }

      const payload: WorkflowLatestRunResponse = { run };
      return NextResponse.json(payload);
    }

    const runs = await listWorkflowRunsForBranch(target, ref);
    const filtered = runs
      .filter((run) => workflowMatchesConfig(target, run))
      .filter((run) => {
        if (!createdAfter) {
          return true;
        }

        return new Date(run.createdAt).getTime() >= new Date(createdAfter).getTime() - 5_000;
      })
      .sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });

    const latest = filtered[0];
    if (!latest) {
      return errorResponse(404, "RUN_NOT_FOUND", "No workflow run found for this branch yet.");
    }

    const payload: WorkflowLatestRunResponse = {
      run: latest,
    };

    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
