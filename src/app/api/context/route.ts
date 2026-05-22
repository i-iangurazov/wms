import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canUseDevAuthFallback, contextCookieNames, getRequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { prisma } from "@/server/db";
import { listCurrentUserOrganizations } from "@/server/services/organizationService";
import { sessionCookieName, switchSessionOrganization } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const organizations = await listCurrentUserOrganizations(context);
    return jsonOk({
      context: {
        userId: context.user.id,
        storeId: context.storeId,
        role: context.role
      },
      organizations
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const storeId = readString(body, "storeId");
    const sessionToken = request.cookies.get(sessionCookieName)?.value;
    const switchedSession = sessionToken
      ? await switchSessionOrganization({ token: sessionToken, userId: context.user.id, storeId })
      : null;
    const membership =
      switchedSession?.membership ??
      (await prisma.storeUser.findUnique({
        where: { storeId_userId: { storeId, userId: context.user.id } },
        include: { store: true }
      }));
    if (!membership || !membership.store.active) {
      throw new AppError("Нет доступа к этой организации.", 403);
    }
    const response = NextResponse.json({
      context: {
        userId: context.user.id,
        storeId: membership.storeId,
        role: membership.role
      }
    });
    if (!sessionToken && canUseDevAuthFallback()) {
      response.cookies.set(contextCookieNames.userId, context.user.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/"
      });
      response.cookies.set(contextCookieNames.storeId, membership.storeId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/"
      });
    }
    if (switchedSession) {
      response.cookies.set(sessionCookieName, switchedSession.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: switchedSession.session.expiresAt
      });
    }
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
