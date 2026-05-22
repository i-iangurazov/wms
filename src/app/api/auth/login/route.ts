import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonError, parseJsonObject, readString } from "@/server/http";
import { authenticateWithPassword, sessionCookieName } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonObject(request);
    const auth = await authenticateWithPassword({
      email: readString(body, "email"),
      password: readString(body, "password"),
      storeId: readString(body, "storeId", false)
    });
    const response = NextResponse.json({
      user: {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email
      },
      context: {
        storeId: auth.membership.storeId,
        role: auth.membership.role
      }
    });
    response.cookies.set(sessionCookieName, auth.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: auth.session.expiresAt
    });
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
