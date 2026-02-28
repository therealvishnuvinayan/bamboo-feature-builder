import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, handleRouteError } from "@/lib/api-utils";
import { ensureBranchDemo } from "@/lib/demo-mode";
import { extractTicketDigits, toBranchToken } from "@/lib/feature-env";
import { GithubApiError, createBranchRef, getBranch, getGithubConfig, isDemoMode } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  target: z.enum(["admin", "client"]),
  ticketDigits: z.string().trim().min(1),
  baseBranch: z.string().trim().optional(),
  branchName: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const target = body.target;
    const ticketDigits = extractTicketDigits(body.ticketDigits);

    if (!ticketDigits) {
      return errorResponse(400, "INVALID_TICKET_DIGITS", "Provide a numeric BAM ticket value.");
    }

    const { defaultBaseBranch } = getGithubConfig();
    const baseBranch = body.baseBranch || defaultBaseBranch;
    const branchToken = toBranchToken(ticketDigits);
    const branchName = body.branchName || `deploy-${branchToken}`;

    if (!branchName.toUpperCase().includes(branchToken)) {
      return errorResponse(
        400,
        "INVALID_BRANCH_NAME",
        `Branch name must include ${branchToken} so the frontend workflow can derive the ticket.`,
      );
    }

    if (isDemoMode()) {
      return NextResponse.json(
        await ensureBranchDemo({
          target,
          ticketDigits,
          baseBranch,
          branchName,
        }),
      );
    }

    try {
      const existing = await getBranch(target, branchName);
      return NextResponse.json({
        created: false,
        branch: {
          name: existing.name,
          sha: existing.commit.sha,
          baseBranch,
        },
      });
    } catch (error) {
      if (!(error instanceof GithubApiError) || error.status !== 404) {
        throw error;
      }
    }

    const base = await getBranch(target, baseBranch);
    const created = await createBranchRef(target, branchName, base.commit.sha);

    return NextResponse.json({
      created: true,
      branch: {
        name: branchName,
        sha: created.object.sha,
        baseBranch,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
