import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, handleRouteError } from "@/lib/api-utils";
import {
  getLocalAccessCookieOptions,
  getLocalAccessCookieValue,
  validateLocalAccessCredentials,
  LOCAL_ACCESS_COOKIE_NAME,
} from "@/lib/local-auth-server";
import type { LocalAccessSession } from "@/lib/local-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  username: z.string().trim().min(1, "Enter username."),
  password: z.string().min(1, "Enter password."),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const result = validateLocalAccessCredentials(body);

    if (!result.ok) {
      return errorResponse(
        result.code === "LOCAL_ACCESS_NOT_CONFIGURED" ? 500 : 401,
        result.code,
        result.message,
      );
    }

    const response = NextResponse.json({
      authenticated: true,
      configured: true,
      username: result.username,
    } satisfies LocalAccessSession);

    response.cookies.set(
      LOCAL_ACCESS_COOKIE_NAME,
      getLocalAccessCookieValue(),
      getLocalAccessCookieOptions(),
    );

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
