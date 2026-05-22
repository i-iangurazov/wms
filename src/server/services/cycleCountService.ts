import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { assertStoreAccess } from "@/server/storeAccess";
import { writeAuditLog } from "@/server/services/auditService";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";
import {
  assertCanApproveCount,
  assertCanRejectCount,
  assertCanSubmitCount,
  countDifference
} from "@/server/services/cycleCountRules";

export async function listCycleCounts(context: RequestContext) {
  requirePermission(context.role, "cycleCounts.execute");
  return prisma.cycleCountSession.findMany({
    where: { storeId: context.storeId },
    include: {
      warehouse: true,
      location: true,
      lines: { include: { product: true, variant: true }, orderBy: { product: { sku: "asc" } } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function createCycleCount(
  context: RequestContext,
  input: { warehouseId: string; locationId: string }
) {
  requirePermission(context.role, "cycleCounts.execute");
  return prisma.$transaction(async (tx) => {
    await assertStoreAccess(tx, context, context.storeId);
    const location = await tx.warehouseLocation.findFirst({
      where: {
        id: input.locationId,
        storeId: context.storeId,
        warehouseId: input.warehouseId,
        status: "ACTIVE"
      }
    });
    if (!location) {
      throw new AppError("Active count location not found.", 404);
    }

    const balances = await tx.inventoryLocationBalance.findMany({
      where: { storeId: context.storeId, warehouseId: input.warehouseId, locationId: input.locationId }
    });

    const session = await tx.cycleCountSession.create({
      data: {
        storeId: context.storeId,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        status: "COUNTING",
        createdById: context.user.id,
        lines: {
          create: balances.map((balance) => ({
            productId: balance.productId,
            variantId: balance.variantId,
            variantKey: balance.variantKey,
            expectedQty: balance.onHandQty,
            difference: 0
          }))
        }
      },
      include: { lines: true }
    });

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "cycle_count.create",
      entityType: "CycleCountSession",
      entityId: session.id,
      metadata: { lineCount: session.lines.length, locationId: input.locationId }
    });
    return session;
  });
}

export async function updateCycleCountLine(
  context: RequestContext,
  input: { lineId: string; countedQty: number }
) {
  requirePermission(context.role, "cycleCounts.execute");
  return prisma.$transaction(async (tx) => {
    const line = await tx.cycleCountLine.findUnique({
      where: { id: input.lineId },
      include: { session: true }
    });
    if (!line || line.session.storeId !== context.storeId) {
      throw new AppError("Cycle count line not found.", 404);
    }
    if (line.session.status !== "COUNTING") {
      throw new AppError("Cycle count is not open for counting.", 409);
    }
    const difference = countDifference(line.expectedQty, input.countedQty);
    const updated = await tx.cycleCountLine.update({
      where: { id: line.id },
      data: { countedQty: input.countedQty, difference }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "cycle_count_line.count",
      entityType: "CycleCountLine",
      entityId: line.id,
      metadata: { countedQty: input.countedQty, difference }
    });
    return updated;
  });
}

export async function submitCycleCount(context: RequestContext, id: string) {
  requirePermission(context.role, "cycleCounts.execute");
  return prisma.$transaction(async (tx) => {
    const session = await tx.cycleCountSession.findFirst({
      where: { id, storeId: context.storeId },
      include: { lines: true }
    });
    if (!session) {
      throw new AppError("Cycle count not found.", 404);
    }
    if (session.status !== "COUNTING") {
      throw new AppError("Cycle count is not open for submission.", 409);
    }
    assertCanSubmitCount(session.lines);
    const updated = await tx.cycleCountSession.update({
      where: { id: session.id },
      data: { status: "PENDING_APPROVAL" }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "cycle_count.submit",
      entityType: "CycleCountSession",
      entityId: session.id
    });
    return updated;
  });
}

export async function approveCycleCount(context: RequestContext, id: string) {
  requirePermission(context.role, "cycleCounts.approve");
  return prisma.$transaction(async (tx) => {
    const session = await tx.cycleCountSession.findFirst({
      where: { id, storeId: context.storeId },
      include: { lines: true }
    });
    if (!session) {
      throw new AppError("Cycle count not found.", 404);
    }
    assertCanApproveCount(session.status);

    for (const line of session.lines) {
      if (line.difference === 0) {
        continue;
      }
      await applyStockMovementInTransaction(tx, context, {
        productId: line.productId,
        variantId: line.variantId,
        type: "CYCLE_COUNT_CORRECTION",
        quantity: Math.abs(line.difference),
        fromLocationId: line.difference < 0 ? session.locationId : undefined,
        toLocationId: line.difference > 0 ? session.locationId : undefined,
        reason: "COUNT_CORRECTION",
        referenceType: "CycleCountSession",
        referenceId: session.id,
        note: "Approved cycle count correction"
      });
    }

    const updated = await tx.cycleCountSession.update({
      where: { id: session.id },
      data: {
        status: "APPROVED",
        approvedById: context.user.id,
        approvedAt: new Date()
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "cycle_count.approve",
      entityType: "CycleCountSession",
      entityId: session.id
    });
    return updated;
  });
}

export async function rejectCycleCount(context: RequestContext, id: string) {
  requirePermission(context.role, "cycleCounts.approve");
  return prisma.$transaction(async (tx) => {
    const session = await tx.cycleCountSession.findFirst({
      where: { id, storeId: context.storeId },
      include: { lines: true }
    });
    if (!session) {
      throw new AppError("Cycle count not found.", 404);
    }
    assertCanRejectCount(session.status);

    const updated = await tx.cycleCountSession.update({
      where: { id: session.id },
      data: { status: "COUNTING" }
    });

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "cycle_count.reject",
      entityType: "CycleCountSession",
      entityId: session.id,
      metadata: { lineCount: session.lines.length }
    });

    return updated;
  });
}
