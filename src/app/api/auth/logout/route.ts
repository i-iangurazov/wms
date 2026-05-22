import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { destroySession, sessionCookieName } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await destroySession(request.cookies.get(sessionCookieName)?.value);
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
