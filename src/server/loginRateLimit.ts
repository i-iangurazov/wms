import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";

export const loginRateLimitConfig = {
  maxFailedAttempts: 5,
  windowMs: 15 * 60 * 1000
} as const;

export function normalizeLoginEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashLoginIp(ipAddress: string) {
  const salt = process.env.LOGIN_RATE_LIMIT_SALT ?? "local-wms-login-rate-limit";
  return createHash("sha256").update(`${salt}:${ipAddress}`).digest("hex");
}

export function getRequestIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwardedFor ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export function isLoginRateLimited(failedAttempts: number, maxFailedAttempts = loginRateLimitConfig.maxFailedAttempts) {
  return failedAttempts >= maxFailedAttempts;
}

export async function enforceLoginRateLimit(input: { email: string; ipAddress: string }) {
  const email = normalizeLoginEmail(input.email);
  const ipHash = hashLoginIp(input.ipAddress);
  const windowStart = new Date(Date.now() - loginRateLimitConfig.windowMs);
  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: windowStart },
      OR: [{ email }, { ipHash }]
    }
  });

  if (isLoginRateLimited(failedAttempts)) {
    throw new AppError("Слишком много попыток входа. Подождите 15 минут и попробуйте снова.", 429);
  }
}

export async function recordLoginAttempt(input: {
  email: string;
  ipAddress: string;
  success: boolean;
  userId?: string | null;
}) {
  await prisma.loginAttempt.create({
    data: {
      email: normalizeLoginEmail(input.email),
      ipHash: hashLoginIp(input.ipAddress),
      success: input.success,
      userId: input.userId ?? null
    }
  });
}

