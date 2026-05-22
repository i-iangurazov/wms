import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jsonError, parseJsonObject, readString } from "@/server/http";
import { authenticateWithPassword, sessionCookieName } from "@/server/session";
import {
  enforceLoginRateLimit,
  getRequestIp,
  recordLoginAttempt
} from "@/server/loginRateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonObject(request);
    const email = readString(body, "email");
    const password = readString(body, "password");
    const storeId = readString(body, "storeId", false);
    const ipAddress = getRequestIp(request.headers);

    await enforceLoginRateLimit({ email, ipAddress });

    let auth;
    try {
      auth = await authenticateWithPassword({
        email,
        password,
        storeId
      });
    } catch (error) {
      await recordLoginAttempt({ email, ipAddress, success: false });
      throw error;
    }
    await recordLoginAttempt({ email, ipAddress, success: true, userId: auth.user.id });
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
