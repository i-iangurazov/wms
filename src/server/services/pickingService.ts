import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";
import { attachWorkflowMovement, claimWorkflowCommand } from "@/server/services/commandIdempotency";
import {
  assertLocationScanMatches,
  assertPickQuantity,
  assertProductScanMatches,
  headerStatusForLineStatuses,
  pickExceptionReason
} from "@/server/services/pickingRules";

export async function listPickWork(context: RequestContext) {
  requirePermission(context.role, "picking.execute");
  return prisma.warehouseWork.findMany({
    where: { storeId: context.storeId, type: "PICK" },
    include: {
      warehouse: true,
      sourceOrder: true,
      lines: {
        include: { sourceLocation: true, product: true, variant: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function createPickWorkFromOrder(
  context: RequestContext,
  input: { orderId: string; warehouseId: string }
) {
  requirePermission(context.role, "picking.create");
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findFirst({
      where: { id: input.orderId, storeId: context.storeId },
      include: { lines: true, work: true }
    });
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    if (order.work.some((work) => work.type === "PICK" && work.status !== "CANCELLED")) {
      throw new AppError("Pick work already exists for this order.", 409);
    }
    if (order.status !== "ALLOCATED") {
      throw new AppError("Order must be allocated before pick work.", 409);
    }
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, storeId: context.storeId, status: "ACTIVE" }
    });
    if (!warehouse) {
      throw new AppError("Active warehouse not found.", 404);
    }

    const reservations = await tx.inventoryReservation.findMany({
      where: {
        storeId: context.storeId,
        warehouseId: warehouse.id,
        status: "RESERVED",
        orderLine: { orderId: order.id }
      },
      orderBy: { createdAt: "asc" }
    });
    if (reservations.length === 0) {
      throw new AppError("Order must be allocated before pick work.", 409);
    }
    const reservedByOrderLine = new Map<string, number>();
    for (const reservation of reservations) {
      reservedByOrderLine.set(
        reservation.orderLineId,
        (reservedByOrderLine.get(reservation.orderLineId) ?? 0) + reservation.quantity
      );
    }
    for (const orderLine of order.lines) {
      if ((reservedByOrderLine.get(orderLine.id) ?? 0) !== orderLine.quantity) {
        throw new AppError("Order allocation does not cover all order lines.", 409);
      }
    }

    const work = await tx.warehouseWork.create({
      data: {
        storeId: context.storeId,
        warehouseId: warehouse.id,
        type: "PICK",
        status: "OPEN",
        sourceOrderId: order.id,
        createdById: context.user.id,
        lines: {
          create: reservations.map((reservation) => ({
            reservationId: reservation.id,
            sourceLocationId: reservation.locationId,
            productId: reservation.productId,
            variantId: reservation.variantId,
            variantKey: reservation.variantKey,
            quantity: reservation.quantity
          }))
        }
      },
      include: { lines: true }
    });
    await tx.customerOrder.update({ where: { id: order.id }, data: { status: "PICKING" } });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work.create_pick",
      entityType: "WarehouseWork",
      entityId: work.id,
      metadata: { orderId: order.id, lineCount: work.lines.length }
    });
    return work;
  });
}

export async function confirmPickLine(
  context: RequestContext,
  input: { lineId: string; locationScan: string; productScan: string; quantity: number; idempotencyKey?: string | null }
) {
  requirePermission(context.role, "picking.execute");
  return prisma.$transaction(async (tx) => {
    const line = await tx.warehouseWorkLine.findUnique({
      where: { id: input.lineId },
      include: {
        work: { include: { lines: true, sourceOrder: true } },
        reservation: true,
        sourceLocation: true,
        product: true,
        variant: true
      }
    });
    if (!line || line.work.storeId !== context.storeId || line.work.type !== "PICK") {
      throw new AppError("Pick line not found.", 404);
    }
    const command = await claimWorkflowCommand(tx, context, {
      idempotencyKey: input.idempotencyKey,
      operation: "PICK",
      payload: {
        action: "confirmPickLine",
        lineId: input.lineId,
        locationScan: input.locationScan,
        productScan: input.productScan,
        quantity: input.quantity
      }
    });
    if (command?.replay) {
      return line;
    }
    if (line.status === "COMPLETED") {
      throw new AppError("Pick line is already completed.", 409);
    }

    assertLocationScanMatches(input.locationScan, line.sourceLocation);
    assertProductScanMatches(input.productScan, line.product, line.variant);
    const remaining = line.quantity - line.pickedQuantity;
    assertPickQuantity({ requested: input.quantity, remaining });

    if (line.reservation) {
      if (line.reservation.status !== "RESERVED" && line.reservation.status !== "PICKING") {
        throw new AppError("Reservation is not available for picking.", 409);
      }
      await applyStockMovementInTransaction(tx, context, {
        productId: line.productId,
        variantId: line.variantId,
        type: "RELEASE_RESERVATION",
        quantity: input.quantity,
        stockStateLocationId: line.sourceLocationId,
        stockStateDelta: { reservedQty: -input.quantity },
        referenceType: "WarehouseWorkLine",
        referenceId: line.id
      });
    }

    const movement = await applyStockMovementInTransaction(tx, context, {
      productId: line.productId,
      variantId: line.variantId,
      type: "PICK",
      quantity: input.quantity,
      fromLocationId: line.sourceLocationId,
      referenceType: "WarehouseWorkLine",
      referenceId: line.id
    });
    await attachWorkflowMovement(tx, command?.commandId, movement.id);

    const pickedQuantity = line.pickedQuantity + input.quantity;
    const lineStatus = pickedQuantity >= line.quantity ? "COMPLETED" : "IN_PROGRESS";
    const exceptionReason = pickExceptionReason({ pickedQuantity, requiredQuantity: line.quantity });
    if (line.reservation) {
      await tx.inventoryReservation.update({
        where: { id: line.reservation.id },
        data: { status: lineStatus === "COMPLETED" ? "PICKED" : "PICKING" }
      });
    }
    const updatedLine = await tx.warehouseWorkLine.update({
      where: { id: line.id },
      data: {
        pickedQuantity,
        status: lineStatus,
        exceptionReason,
        locationConfirmedAt: line.locationConfirmedAt ?? new Date(),
        productConfirmedAt: line.productConfirmedAt ?? new Date(),
        completedAt: lineStatus === "COMPLETED" ? new Date() : null
      }
    });

    const siblingStatuses = line.work.lines.map((workLine) =>
      workLine.id === line.id ? lineStatus : workLine.status
    );
    const nextWorkStatus = headerStatusForLineStatuses(siblingStatuses);
    await tx.warehouseWork.update({
      where: { id: line.workId },
      data: {
        status: nextWorkStatus,
        completedAt: nextWorkStatus === "COMPLETED" ? new Date() : null
      }
    });
    if (nextWorkStatus === "COMPLETED" && line.work.sourceOrderId) {
      await tx.customerOrder.update({ where: { id: line.work.sourceOrderId }, data: { status: "PICKED" } });
    }
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work_line.pick",
      entityType: "WarehouseWorkLine",
      entityId: line.id,
      metadata: { quantity: input.quantity, status: lineStatus, exceptionReason }
    });
    return updatedLine;
  });
}

export async function resolveShortPickLine(
  context: RequestContext,
  input: { lineId: string; note?: string | null; idempotencyKey?: string | null }
) {
  requirePermission(context.role, "picking.create");
  return prisma.$transaction(async (tx) => {
    const line = await tx.warehouseWorkLine.findUnique({
      where: { id: input.lineId },
      include: {
        work: { include: { lines: true, sourceOrder: true } },
        reservation: true
      }
    });
    if (!line || line.work.storeId !== context.storeId || line.work.type !== "PICK") {
      throw new AppError("Pick line not found.", 404);
    }
    const command = await claimWorkflowCommand(tx, context, {
      idempotencyKey: input.idempotencyKey,
      operation: "RELEASE_RESERVATION",
      payload: {
        action: "resolveShortPickLine",
        lineId: input.lineId,
        note: input.note ?? null
      }
    });
    if (command?.replay) {
      return line;
    }
    if (line.status === "COMPLETED") {
      throw new AppError("Pick line is already completed.", 409);
    }
    const remaining = line.quantity - line.pickedQuantity;
    if (remaining <= 0) {
      throw new AppError("No remaining quantity to short pick.", 409);
    }
    if (!line.reservation) {
      throw new AppError("Reservation is required for short pick resolution.", 409);
    }

    if (line.reservation.status === "RESERVED" || line.reservation.status === "PICKING") {
      const movement = await applyStockMovementInTransaction(tx, context, {
        productId: line.productId,
        variantId: line.variantId,
        type: "RELEASE_RESERVATION",
        quantity: remaining,
        stockStateLocationId: line.sourceLocationId,
        stockStateDelta: { reservedQty: -remaining },
        note: input.note,
        referenceType: "WarehouseWorkLine",
        referenceId: line.id
      });
      await attachWorkflowMovement(tx, command?.commandId, movement.id);
      await tx.inventoryReservation.update({
        where: { id: line.reservation.id },
        data: { status: "SHORT" }
      });
    } else {
      throw new AppError("Reservation is not available for picking.", 409);
    }

    const updatedLine = await tx.warehouseWorkLine.update({
      where: { id: line.id },
      data: {
        status: "COMPLETED",
        exceptionReason: "SHORT_PICK_REVIEW",
        completedAt: new Date()
      }
    });

    const siblingStatuses = line.work.lines.map((workLine) =>
      workLine.id === line.id ? "COMPLETED" : workLine.status
    );
    const nextWorkStatus = headerStatusForLineStatuses(siblingStatuses);
    await tx.warehouseWork.update({
      where: { id: line.workId },
      data: {
        status: nextWorkStatus,
        completedAt: nextWorkStatus === "COMPLETED" ? new Date() : null
      }
    });
    if (nextWorkStatus === "COMPLETED" && line.work.sourceOrderId) {
      await tx.customerOrder.update({ where: { id: line.work.sourceOrderId }, data: { status: "SHORT_PICKED" } });
    }
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work_line.short_pick",
      entityType: "WarehouseWorkLine",
      entityId: line.id,
      metadata: { remaining, note: input.note ?? null }
    });
    return updatedLine;
  });
}
