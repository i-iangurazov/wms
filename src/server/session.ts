import { createHash, randomBytes } from "node:crypto";
import type { StoreUser } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { verifyPassword } from "@/server/password";
import { sessionCookieName } from "@/lib/authCookies";

export { sessionCookieName };
const sessionTtlMs = 1000 * 60 * 60 * 12;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

async function createUserSession(input: { userId: string; storeId: string }) {
  const token = createSessionToken();
  const session = await prisma.userSession.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId: input.userId,
      storeId: input.storeId,
      expiresAt: new Date(Date.now() + sessionTtlMs)
    }
  });
  return { token, session };
}

export async function authenticateWithPassword(input: { email: string; password: string; storeId?: string | null }) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError("Неверный email или пароль.", 401);
  }

  const membership = await prisma.storeUser.findFirst({
    where: {
      userId: user.id,
      storeId: input.storeId || undefined,
      store: { active: true }
    },
    include: { store: true },
    orderBy: { createdAt: "asc" }
  });
  if (!membership) {
    throw new AppError("Нет доступа к активной организации.", 403);
  }

  const { token, session } = await createUserSession({ userId: user.id, storeId: membership.storeId });

  return { token, session, user, membership };
}

export async function getSessionContext(token: string | undefined) {
  if (!token) {
    return null;
  }
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true, store: true }
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active || !session.store.active) {
    return null;
  }
  const membership: StoreUser | null = await prisma.storeUser.findUnique({
    where: { storeId_userId: { storeId: session.storeId, userId: session.userId } }
  });
  if (!membership) {
    return null;
  }
  return { user: session.user, storeId: session.storeId, role: membership.role };
}

export async function destroySession(token: string | undefined) {
  if (!token) {
    return;
  }
  await prisma.userSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export async function switchSessionOrganization(input: { token: string; userId: string; storeId: string }) {
  const membership = await prisma.storeUser.findUnique({
    where: { storeId_userId: { storeId: input.storeId, userId: input.userId } },
    include: { store: true }
  });
  if (!membership || !membership.store.active) {
    throw new AppError("Нет доступа к этой организации.", 403);
  }
  const oldTokenHash = hashSessionToken(input.token);
  const nextToken = createSessionToken();
  const session = await prisma.$transaction(async (tx) => {
    const existing = await tx.userSession.findFirst({
      where: { tokenHash: oldTokenHash, userId: input.userId }
    });
    if (!existing || existing.expiresAt <= new Date()) {
      throw new AppError("Сессия истекла. Войдите снова.", 401);
    }
    await tx.userSession.delete({ where: { id: existing.id } });
    return tx.userSession.create({
      data: {
        tokenHash: hashSessionToken(nextToken),
        userId: input.userId,
        storeId: membership.storeId,
        expiresAt: new Date(Date.now() + sessionTtlMs)
      }
    });
  });
  return { membership, token: nextToken, session };
}
