import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { requirePermission } from "@/server/permissions";

type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

export async function writeAuditLog(
  db: AuditClient,
  input: {
    storeId?: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await db.auditLog.create({
    data: {
      storeId: input.storeId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata
    }
  });
}

export async function listAuditLogs(
  context: RequestContext,
  filters: { action?: string; entityType?: string; userId?: string } = {}
) {
  requirePermission(context.role, "WMS_VIEW_AUDIT");
  return prisma.auditLog.findMany({
    where: {
      storeId: context.storeId,
      action: filters.action,
      entityType: filters.entityType,
      userId: filters.userId
    },
    include: {
      user: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}
