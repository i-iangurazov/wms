import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import { availableQuantity, variantKey } from "@/server/services/stockMovementEngine";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";
import {
  assertPutAwayDestination,
  assertQuantityWithinAvailable,
  assertReceivingLocation
} from "@/server/services/receivingRules";
import { suggestPutawayDestinationId } from "@/server/services/warehouseRuleService";

export async function listPutawayWork(context: RequestContext) {
  requirePermission(context.role, "putaway.execute");
  return prisma.warehouseWork.findMany({
    where: { storeId: context.storeId, type: "PUTAWAY" },
    include: {
      warehouse: true,
      lines: {
        include: {
          sourceLocation: true,
          destinationLocation: true,
          product: true,
          variant: true,
          receivingLine: true
        },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function generatePutawayWorkForSession(context: RequestContext, sessionId: string) {
  requirePermission(context.role, "putaway.execute");
  return prisma.$transaction(async (tx) => {
    const session = await tx.receivingSession.findFirst({
      where: { id: sessionId, storeId: context.storeId },
      include: { lines: true, warehouse: true }
    });
    if (!session) {
      throw new AppError("Receiving session not found.", 404);
    }
    const destinationLocationId = await suggestPutawayDestinationId(tx, context, session.warehouseId);
    if (!destinationLocationId) {
      throw new AppError("Put-away destination is not configured.", 409);
    }
    const destination = await tx.warehouseLocation.findFirst({
      where: { id: destinationLocationId, storeId: context.storeId }
    });
    if (!destination) {
      throw new AppError("Destination location not found.", 404);
    }
    assertPutAwayDestination(destination);

    const workLines = [];
    for (const line of session.lines) {
      const receivedGoodQty = line.receivedQty;
      if (receivedGoodQty <= 0) {
        continue;
      }
      const existingWork = await tx.warehouseWorkLine.aggregate({
        where: {
          receivingLineId: line.id,
          work: { storeId: context.storeId, type: "PUTAWAY", status: { not: "CANCELLED" } }
        },
        _sum: { quantity: true }
      });
      const alreadyPlanned = existingWork._sum.quantity ?? 0;
      const remaining = receivedGoodQty - alreadyPlanned;
      if (remaining > 0) {
        workLines.push({
          receivingLineId: line.id,
          sourceLocationId: session.receivingLocationId,
          destinationLocationId,
          productId: line.productId,
          variantId: line.variantId,
          variantKey: line.variantKey,
          quantity: remaining
        });
      }
    }

    if (workLines.length === 0) {
      throw new AppError("No received stock is waiting for put-away.", 409);
    }

    const work = await tx.warehouseWork.create({
      data: {
        storeId: context.storeId,
        warehouseId: session.warehouseId,
        type: "PUTAWAY",
        status: "OPEN",
        createdById: context.user.id,
        lines: { create: workLines }
      },
      include: { lines: true }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work.create_putaway",
      entityType: "WarehouseWork",
      entityId: work.id,
      metadata: { sessionId, lineCount: work.lines.length }
    });
    return work;
  });
}

export async function putAwayStock(
  context: RequestContext,
  input: {
    fromLocationId: string;
    toLocationId: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    note?: string | null;
    idempotencyKey?: string | null;
  }
) {
  requirePermission(context.role, "putaway.execute");
  return prisma.$transaction(async (tx) => {
    const [fromLocation, toLocation, balance] = await Promise.all([
      tx.warehouseLocation.findFirst({ where: { id: input.fromLocationId, storeId: context.storeId } }),
      tx.warehouseLocation.findFirst({ where: { id: input.toLocationId, storeId: context.storeId } }),
      tx.inventoryLocationBalance.findUnique({
        where: {
          storeId_locationId_productId_variantKey: {
            storeId: context.storeId,
            locationId: input.fromLocationId,
            productId: input.productId,
            variantKey: variantKey(input.variantId)
          }
        }
      })
    ]);
    if (!fromLocation) {
      throw new AppError("Source receiving location not found.", 404);
    }
    if (!toLocation) {
      throw new AppError("Destination location not found.", 404);
    }
    assertReceivingLocation(fromLocation);
    assertPutAwayDestination(toLocation);
    assertQuantityWithinAvailable(input.quantity, balance ? availableQuantity(balance) : 0);

    const movement = await applyStockMovementInTransaction(tx, context, {
      productId: input.productId,
      variantId: input.variantId,
      type: "PUTAWAY",
      quantity: input.quantity,
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      note: input.note,
      referenceType: "PutAway",
      idempotencyKey: input.idempotencyKey
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "putaway.create",
      entityType: "InventoryMovement",
      entityId: movement.id,
      metadata: { quantity: input.quantity }
    });
    return movement;
  });
}

export async function confirmPutawayLine(
  context: RequestContext,
  input: {
    lineId: string;
    toLocationId?: string | null;
    quantity: number;
    note?: string | null;
    idempotencyKey?: string | null;
  }
) {
  requirePermission(context.role, "putaway.execute");
  return prisma.$transaction(async (tx) => {
    const line = await tx.warehouseWorkLine.findUnique({
      where: { id: input.lineId },
      include: { work: { include: { lines: true } }, sourceLocation: true, destinationLocation: true }
    });
    if (!line || line.work.storeId !== context.storeId || line.work.type !== "PUTAWAY") {
      throw new AppError("Put-away line not found.", 404);
    }
    if (line.status === "COMPLETED") {
      throw new AppError("Put-away line is already completed.", 409);
    }
    const remaining = line.quantity - line.completedQuantity;
    assertQuantityWithinAvailable(input.quantity, remaining);
    const destinationId = input.toLocationId ?? line.destinationLocationId;
    if (!destinationId) {
      throw new AppError("Destination location not found.", 404);
    }

    const [destination, balance] = await Promise.all([
      tx.warehouseLocation.findFirst({ where: { id: destinationId, storeId: context.storeId } }),
      tx.inventoryLocationBalance.findUnique({
        where: {
          storeId_locationId_productId_variantKey: {
            storeId: context.storeId,
            locationId: line.sourceLocationId,
            productId: line.productId,
            variantKey: line.variantKey
          }
        }
      })
    ]);
    if (!destination) {
      throw new AppError("Destination location not found.", 404);
    }
    assertReceivingLocation(line.sourceLocation);
    assertPutAwayDestination(destination);
    assertQuantityWithinAvailable(input.quantity, balance ? availableQuantity(balance) : 0);

    const movement = await applyStockMovementInTransaction(tx, context, {
      productId: line.productId,
      variantId: line.variantId,
      type: "PUTAWAY",
      quantity: input.quantity,
      fromLocationId: line.sourceLocationId,
      toLocationId: destinationId,
      note: input.note,
      referenceType: "WarehouseWorkLine",
      referenceId: line.id,
      idempotencyKey: input.idempotencyKey
    });

    const completedQuantity = line.completedQuantity + input.quantity;
    const lineStatus = completedQuantity >= line.quantity ? "COMPLETED" : "IN_PROGRESS";
    const updatedLine = await tx.warehouseWorkLine.update({
      where: { id: line.id },
      data: {
        destinationLocationId: destinationId,
        completedQuantity,
        status: lineStatus,
        completedAt: lineStatus === "COMPLETED" ? new Date() : null
      }
    });
    const siblingStatuses = line.work.lines.map((workLine) =>
      workLine.id === line.id ? lineStatus : workLine.status
    );
    const nextWorkStatus = siblingStatuses.every((status) => status === "COMPLETED")
      ? "COMPLETED"
      : siblingStatuses.some((status) => status === "IN_PROGRESS" || status === "COMPLETED")
        ? "IN_PROGRESS"
        : "OPEN";
    await tx.warehouseWork.update({
      where: { id: line.workId },
      data: {
        status: nextWorkStatus,
        completedAt: nextWorkStatus === "COMPLETED" ? new Date() : null
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work_line.putaway",
      entityType: "WarehouseWorkLine",
      entityId: line.id,
      metadata: { movementId: movement.id, quantity: input.quantity, status: lineStatus }
    });
    return updatedLine;
  });
}
