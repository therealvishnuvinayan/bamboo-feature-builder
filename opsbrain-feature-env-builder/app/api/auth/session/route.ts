import { NextRequest, NextResponse } from "next/server";

import {
  getLocalAccessConfig,
  isLocalAccessCookieValid,
  LOCAL_ACCESS_COOKIE_NAME,
} from "@/lib/local-auth-server";
import type { LocalAccessSession } from "@/lib/local-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getLocalAccessConfig();
  const cookieValue = request.cookies.get(LOCAL_ACCESS_COOKIE_NAME)?.value;

  const payload: LocalAccessSession = {
    authenticated: config.configured && isLocalAccessCookieValid(cookieValue),
    configured: config.configured,
    username: config.username,
  };

  return NextResponse.json(payload);
}
