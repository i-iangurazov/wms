import type { NextRequest } from "next/server";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getSessionContext, sessionCookieName } from "@/server/session";

export type RequestContext = {
  user: User;
  storeId: string;
  role: Role;
};

export const contextCookieNames = {
  userId: "wms_user_id",
  storeId: "wms_store_id"
} as const;

export function canUseDevAuthFallback(env: NodeJS.ProcessEnv = process.env) {
  return env.ALLOW_DEV_AUTH_FALLBACK === "true";
}

export async function getRequestContext(request: NextRequest): Promise<RequestContext> {
  const sessionContext = await getSessionContext(request.cookies.get(sessionCookieName)?.value);
  if (sessionContext) {
    return sessionContext;
  }

  const allowDevContext = canUseDevAuthFallback();
  const requestedUserId = allowDevContext
    ? request.headers.get("x-user-id") ?? request.cookies.get(contextCookieNames.userId)?.value
    : null;
  const requestedStoreId = allowDevContext
    ? request.headers.get("x-store-id") ?? request.cookies.get(contextCookieNames.storeId)?.value
    : null;
  const hasExplicitContext = Boolean(requestedUserId || requestedStoreId);

  if (hasExplicitContext && (!requestedUserId || !requestedStoreId)) {
    throw new AppError("Invalid user or store context.", 401);
  }

  if (requestedUserId && requestedStoreId) {
    const storeUser = await prisma.storeUser.findUnique({
      where: { storeId_userId: { storeId: requestedStoreId, userId: requestedUserId } },
      include: { user: true, store: true }
    });
    if (!storeUser || !storeUser.user.active || !storeUser.store.active) {
      throw new AppError("Invalid user or store context.", 401);
    }
    return { user: storeUser.user, storeId: storeUser.storeId, role: storeUser.role };
  }

  if (!allowDevContext) {
    throw new AppError("Request context is required.", 401);
  }

  const fallback = await prisma.storeUser.findFirst({
    include: { user: true, store: true },
    orderBy: { createdAt: "asc" }
  });
  if (!fallback || !fallback.user.active || !fallback.store.active) {
    throw new AppError("No active user/store context found. Run the seed script first.", 401);
  }

  return { user: fallback.user, storeId: fallback.storeId, role: fallback.role };
}
