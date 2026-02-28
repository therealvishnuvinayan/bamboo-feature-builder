import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, handleRouteError } from "@/lib/api-utils";
import { fetchBranchesDemo } from "@/lib/demo-mode";
import { extractTicketDigits, toBranchToken } from "@/lib/feature-env";
import { getCommit, isDemoMode, listRepoBranches } from "@/lib/github";
import type { BranchesResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const targetSchema = z.enum(["admin", "client"]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const target = targetSchema.parse(url.searchParams.get("target") ?? "admin");
    const ticketDigits = extractTicketDigits(url.searchParams.get("ticketDigits") ?? "");

    if (!ticketDigits) {
      return errorResponse(400, "INVALID_TICKET_DIGITS", "Provide ticketDigits as plain digits.");
    }

    if (isDemoMode()) {
      const branches = await fetchBranchesDemo(target, ticketDigits);
      const payload: BranchesResponse = { branches };
      return NextResponse.json(payload);
    }

    const token = toBranchToken(ticketDigits).toLowerCase();
    const repoBranches = await listRepoBranches(target);
    const matches = repoBranches.filter((branch) => branch.name.toLowerCase().includes(token));

    const branches = await Promise.all(
      matches.map(async (branch) => {
        const commit = await getCommit(target, branch.commit.sha);
        return {
          name: branch.name,
          sha: branch.commit.sha,
          updatedAt:
            commit.commit.committer?.date ?? commit.commit.author?.date ?? new Date().toISOString(),
          message: commit.commit.message.split("\n")[0] ?? "No commit message available.",
        };
      }),
    );

    branches.sort((left, right) => {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

    const payload: BranchesResponse = { branches };
    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
