import { NextResponse } from "next/server";

import { LOCAL_ACCESS_COOKIE_NAME } from "@/lib/local-auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true } as const);
  response.cookies.set(LOCAL_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
