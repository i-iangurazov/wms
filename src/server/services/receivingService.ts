import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { assertStoreAccess } from "@/server/storeAccess";
import { writeAuditLog } from "@/server/services/auditService";
import { variantKey } from "@/server/services/stockMovementEngine";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";
import { attachWorkflowMovement, claimWorkflowCommand } from "@/server/services/commandIdempotency";
import {
  assertReceiveQuantities,
  assertReceivingLocation,
  assertReceivingSessionOpen,
  nextReceivingLineStatus,
  shortReceiptQuantity
} from "@/server/services/receivingRules";
import { getDefaultReceivingLocationId } from "@/server/services/warehouseRuleService";

export async function listReceivingSessions(context: RequestContext) {
  requirePermission(context.role, "WMS_RECEIVE_STOCK");
  return prisma.receivingSession.findMany({
    where: { storeId: context.storeId },
    include: {
      warehouse: true,
      receivingLocation: true,
      lines: { include: { product: true, variant: true }, orderBy: { createdAt: "asc" } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function createReceivingSession(
  context: RequestContext,
  input: { warehouseId: string; receivingLocationId?: string | null; reference?: string; note?: string }
) {
  requirePermission(context.role, "WMS_RECEIVE_STOCK");
  return prisma.$transaction(async (tx) => {
    await assertStoreAccess(tx, context, context.storeId);
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, storeId: context.storeId, status: "ACTIVE" }
    });
    if (!warehouse) {
      throw new AppError("Active warehouse not found.", 404);
    }
    const receivingLocationId =
      input.receivingLocationId ?? (await getDefaultReceivingLocationId(tx, context, warehouse.id));
    if (!receivingLocationId) {
      throw new AppError("Default receiving location is not configured.", 400);
    }
    const location = await tx.warehouseLocation.findFirst({
      where: {
        id: receivingLocationId,
        storeId: context.storeId,
        warehouseId: warehouse.id
      }
    });
    if (!location) {
      throw new AppError("Receiving location not found.", 404);
    }
    assertReceivingLocation(location);

    const session = await tx.receivingSession.create({
      data: {
        storeId: context.storeId,
        warehouseId: warehouse.id,
        receivingLocationId: location.id,
        reference: input.reference,
        note: input.note,
        status: "RECEIVING",
        createdById: context.user.id
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "receiving_session.create",
      entityType: "ReceivingSession",
      entityId: session.id,
      metadata: { reference: session.reference }
    });
    return session;
  });
}

export async function addReceivingLine(
  context: RequestContext,
  input: { sessionId: string; productId: string; variantId?: string | null; expectedQty: number }
) {
  requirePermission(context.role, "WMS_RECEIVE_STOCK");
  return prisma.$transaction(async (tx) => {
    const session = await tx.receivingSession.findFirst({
      where: { id: input.sessionId, storeId: context.storeId }
    });
    if (!session) {
      throw new AppError("Receiving session not found.", 404);
    }
    assertReceivingSessionOpen(session.status);
    const product = await tx.product.findFirst({ where: { id: input.productId, storeId: context.storeId } });
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
    if (input.variantId) {
      const variant = await tx.productVariant.findFirst({
        where: { id: input.variantId, storeId: context.storeId, productId: product.id }
      });
      if (!variant) {
        throw new AppError("Product variant not found.", 404);
      }
    }
    if (!Number.isInteger(input.expectedQty) || input.expectedQty < 0) {
      throw new AppError("Expected quantity must be zero or greater.", 400);
    }
    const line = await tx.receivingLine.create({
      data: {
        sessionId: session.id,
        productId: product.id,
        variantId: input.variantId ?? null,
        variantKey: variantKey(input.variantId),
        expectedQty: input.expectedQty
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "receiving_line.create",
      entityType: "ReceivingLine",
      entityId: line.id,
      metadata: { sessionId: session.id, productId: product.id }
    });
    return line;
  });
}

export async function receiveLine(
  context: RequestContext,
  input: {
    lineId: string;
    quantity: number;
    damagedQuantity?: number;
    allowOverReceipt?: boolean;
    note?: string | null;
    idempotencyKey?: string | null;
  }
) {
  requirePermission(context.role, "WMS_RECEIVE_STOCK");
  return prisma.$transaction(async (tx) => {
    const line = await tx.receivingLine.findUnique({
      where: { id: input.lineId },
      include: { session: { include: { receivingLocation: true } } }
    });
    if (!line || line.session.storeId !== context.storeId) {
      throw new AppError("Receiving line not found.", 404);
    }
    const command = await claimWorkflowCommand(tx, context, {
      idempotencyKey: input.idempotencyKey,
      operation: "RECEIVE",
      payload: {
        action: "receiveLine",
        lineId: input.lineId,
        quantity: input.quantity,
        damagedQuantity: input.damagedQuantity ?? 0,
        allowOverReceipt: input.allowOverReceipt ?? false
      }
    });
    if (command?.replay) {
      return line;
    }
    assertReceivingSessionOpen(line.session.status);
    const damagedQuantity = input.damagedQuantity ?? 0;
    assertReceiveQuantities({ goodQty: input.quantity, damagedQty: damagedQuantity });
    const nextReceived = line.receivedQty + input.quantity;
    const nextDamaged = line.damagedQty + damagedQuantity;
    const nextTotal = nextReceived + nextDamaged;
    if (line.expectedQty > 0 && nextTotal > line.expectedQty && !input.allowOverReceipt) {
      throw new AppError("Received quantity exceeds expected quantity.", 409);
    }
    if (line.expectedQty > 0 && nextTotal > line.expectedQty && input.allowOverReceipt) {
      requirePermission(context.role, "WMS_ADJUST_STOCK");
    }

    let movementId: string | undefined;
    if (input.quantity > 0) {
      const movement = await applyStockMovementInTransaction(tx, context, {
        productId: line.productId,
        variantId: line.variantId,
        type: "RECEIVE",
        quantity: input.quantity,
        toLocationId: line.session.receivingLocationId,
        referenceType: "ReceivingLine",
        referenceId: line.id,
        note: input.note
      });
      movementId = movement.id;
    }
    if (damagedQuantity > 0) {
      const damagedReceive = await applyStockMovementInTransaction(tx, context, {
        productId: line.productId,
        variantId: line.variantId,
        type: "RECEIVE",
        quantity: damagedQuantity,
        toLocationId: line.session.receivingLocationId,
        referenceType: "ReceivingLine",
        referenceId: line.id,
        note: input.note
      });
      movementId = movementId ?? damagedReceive.id;
      await applyStockMovementInTransaction(tx, context, {
        productId: line.productId,
        variantId: line.variantId,
        type: "ADJUSTMENT",
        reason: "DAMAGED",
        quantity: damagedQuantity,
        stockStateLocationId: line.session.receivingLocationId,
        stockStateDelta: { damagedQty: damagedQuantity },
        referenceType: "ReceivingLine",
        referenceId: line.id,
        note: input.note ?? "Повреждено при приёмке"
      });
    }
    if (movementId) {
      await attachWorkflowMovement(tx, command?.commandId, movementId);
    }

    const updated = await tx.receivingLine.update({
      where: { id: line.id },
      data: {
        receivedQty: nextReceived,
        damagedQty: nextDamaged,
        status: nextReceivingLineStatus({
          expectedQty: line.expectedQty,
          receivedQty: nextReceived,
          damagedQty: nextDamaged
        }),
        exceptionNote: input.note?.trim() || line.exceptionNote
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "receiving_line.receive",
      entityType: "ReceivingLine",
      entityId: line.id,
      metadata: { quantity: input.quantity, damagedQuantity }
    });
    return updated;
  });
}

export async function completeReceivingSession(
  context: RequestContext,
  id: string,
  input: { allowShortClose?: boolean; note?: string | null } = {}
) {
  requirePermission(context.role, "WMS_RECEIVE_STOCK");
  return prisma.$transaction(async (tx) => {
    const session = await tx.receivingSession.findFirst({
      where: { id, storeId: context.storeId },
      include: { lines: true }
    });
    if (!session) {
      throw new AppError("Receiving session not found.", 404);
    }
    assertReceivingSessionOpen(session.status);
    if (session.lines.length === 0) {
      throw new AppError("Cannot complete a receiving session with no lines.", 409);
    }
    const openLine = session.lines.find((line) => line.status !== "RECEIVED");
    if (openLine) {
      if (!input.allowShortClose) {
        throw new AppError("All receiving lines must be received before completion.", 409);
      }
      if (!input.note?.trim()) {
        throw new AppError("Short receiving close requires a note.", 400);
      }
      await Promise.all(
        session.lines
          .filter((line) => line.status === "OPEN")
          .map((line) =>
            tx.receivingLine.update({
              where: { id: line.id },
              data: {
                status: "CLOSED_SHORT",
                shortQty: shortReceiptQuantity({
                  expectedQty: line.expectedQty,
                  receivedQty: line.receivedQty,
                  damagedQty: line.damagedQty
                }),
                exceptionNote: input.note
              }
            })
          )
      );
    }
    const updated = await tx.receivingSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", completedAt: new Date() }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "receiving_session.complete",
      entityType: "ReceivingSession",
      entityId: session.id
    });
    return updated;
  });
}
