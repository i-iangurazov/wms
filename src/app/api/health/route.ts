import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { canUseDevAuthFallback } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      checkedAt,
      database: "ok",
      authMode: canUseDevAuthFallback() ? "development-fallback-allowed" : "explicit-context-required"
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        checkedAt,
        database: "unavailable"
      },
      { status: 503 }
    );
  }
}
