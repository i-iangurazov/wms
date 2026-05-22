import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import {
  assertProductScanMatches,
  headerStatusForLineStatuses
} from "@/server/services/pickingRules";

function assertPackQuantity(input: { requested: number; remaining: number }) {
  if (!Number.isInteger(input.requested) || input.requested <= 0) {
    throw new AppError("Pack quantity must be a positive whole number.", 400);
  }
  if (input.requested > input.remaining) {
    throw new AppError("Pack quantity exceeds remaining work quantity.", 409);
  }
}

export async function listPacking(context: RequestContext) {
  requirePermission(context.role, "WMS_PICK");
  const [orders, work, warehouses] = await Promise.all([
    prisma.customerOrder.findMany({
      where: { storeId: context.storeId, status: { in: ["PICKED", "PACKING", "PACKED", "READY_TO_SHIP"] } },
      include: { lines: { include: { product: true, variant: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100
    }),
    prisma.warehouseWork.findMany({
      where: { storeId: context.storeId, type: "PACK" },
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
    }),
    prisma.warehouse.findMany({ where: { storeId: context.storeId, status: "ACTIVE" }, orderBy: { code: "asc" } })
  ]);
  return { orders, work, warehouses };
}

export async function createPackWorkFromOrder(
  context: RequestContext,
  input: { orderId: string; warehouseId: string }
) {
  requirePermission(context.role, "WMS_PICK");
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findFirst({
      where: { id: input.orderId, storeId: context.storeId },
      include: { lines: true, work: { include: { lines: true } } }
    });
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    if (order.status !== "PICKED") {
      throw new AppError("Order must be picked before packing.", 409);
    }
    if (order.work.some((work) => work.type === "PACK" && work.status !== "CANCELLED")) {
      throw new AppError("Pack work already exists for this order.", 409);
    }
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, storeId: context.storeId, status: "ACTIVE" }
    });
    if (!warehouse) {
      throw new AppError("Active warehouse not found.", 404);
    }
    const completedPickWork = order.work.filter((work) => work.type === "PICK" && work.status === "COMPLETED");
    if (completedPickWork.length === 0) {
      throw new AppError("Completed pick work is required before packing.", 409);
    }

    const lines = [];
    for (const orderLine of order.lines) {
      const sourcePickLine = completedPickWork
        .flatMap((work) => work.lines)
        .find(
          (line) =>
            line.productId === orderLine.productId &&
            line.variantKey === orderLine.variantKey &&
            line.pickedQuantity >= orderLine.quantity
        );
      if (!sourcePickLine) {
        throw new AppError("Picked order line not found for packing.", 409);
      }
      lines.push({
        sourceLocationId: sourcePickLine.sourceLocationId,
        productId: orderLine.productId,
        variantId: orderLine.variantId,
        variantKey: orderLine.variantKey,
        quantity: orderLine.quantity
      });
    }

    const work = await tx.warehouseWork.create({
      data: {
        storeId: context.storeId,
        warehouseId: warehouse.id,
        type: "PACK",
        status: "OPEN",
        sourceOrderId: order.id,
        createdById: context.user.id,
        lines: { create: lines }
      },
      include: { lines: true }
    });
    await tx.customerOrder.update({ where: { id: order.id }, data: { status: "PACKING" } });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work.create_pack",
      entityType: "WarehouseWork",
      entityId: work.id,
      metadata: { orderId: order.id, lineCount: work.lines.length }
    });
    return work;
  });
}

export async function confirmPackLine(
  context: RequestContext,
  input: { lineId: string; productScan: string; quantity: number }
) {
  requirePermission(context.role, "WMS_PICK");
  return prisma.$transaction(async (tx) => {
    const line = await tx.warehouseWorkLine.findUnique({
      where: { id: input.lineId },
      include: {
        work: { include: { lines: true, sourceOrder: true } },
        product: true,
        variant: true
      }
    });
    if (!line || line.work.storeId !== context.storeId || line.work.type !== "PACK") {
      throw new AppError("Pack line not found.", 404);
    }
    if (line.status === "COMPLETED") {
      throw new AppError("Pack line is already completed.", 409);
    }
    assertProductScanMatches(input.productScan, line.product, line.variant);
    const remaining = line.quantity - line.completedQuantity;
    assertPackQuantity({ requested: input.quantity, remaining });

    const completedQuantity = line.completedQuantity + input.quantity;
    const lineStatus = completedQuantity >= line.quantity ? "COMPLETED" : "IN_PROGRESS";
    const updatedLine = await tx.warehouseWorkLine.update({
      where: { id: line.id },
      data: {
        completedQuantity,
        status: lineStatus,
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
      data: { status: nextWorkStatus, completedAt: nextWorkStatus === "COMPLETED" ? new Date() : null }
    });
    if (nextWorkStatus === "COMPLETED" && line.work.sourceOrderId) {
      await tx.customerOrder.update({ where: { id: line.work.sourceOrderId }, data: { status: "PACKED" } });
    }
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work_line.pack",
      entityType: "WarehouseWorkLine",
      entityId: line.id,
      metadata: { quantity: input.quantity, status: lineStatus }
    });
    return updatedLine;
  });
}

export async function markOrderReadyToShip(context: RequestContext, orderId: string) {
  requirePermission(context.role, "WMS_PICK");
  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findFirst({ where: { id: orderId, storeId: context.storeId } });
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    if (order.status !== "PACKED") {
      throw new AppError("Order must be packed before shipping handoff.", 409);
    }
    const updated = await tx.customerOrder.update({ where: { id: order.id }, data: { status: "READY_TO_SHIP" } });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "customer_order.ready_to_ship",
      entityType: "CustomerOrder",
      entityId: order.id
    });
    return updated;
  });
}
