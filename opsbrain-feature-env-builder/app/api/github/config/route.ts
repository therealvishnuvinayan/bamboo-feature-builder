import { NextResponse } from "next/server";

import { getPublicGithubConfig } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPublicGithubConfig());
}
