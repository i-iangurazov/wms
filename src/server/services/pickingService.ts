import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";
import { availableQuantity } from "@/server/services/stockMovementEngine";
import { attachWorkflowMovement, claimWorkflowCommand } from "@/server/services/commandIdempotency";
import {
  assertLocationScanMatches,
  assertPickQuantity,
  assertProductScanMatches,
  headerStatusForLineStatuses,
  pickExceptionReason
} from "@/server/services/pickingRules";
import { getPickLocationIdsByPriority } from "@/server/services/warehouseRuleService";

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
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, storeId: context.storeId, status: "ACTIVE" }
    });
    if (!warehouse) {
      throw new AppError("Active warehouse not found.", 404);
    }

    const lines = [];
    const pickLocationIdsByPriority = await getPickLocationIdsByPriority(tx, context, warehouse.id);
    const pickPriority = new Map(pickLocationIdsByPriority.map((locationId, index) => [locationId, index]));
    for (const orderLine of order.lines) {
      const candidateBalances = await tx.inventoryLocationBalance.findMany({
        where: {
          storeId: context.storeId,
          warehouseId: warehouse.id,
          productId: orderLine.productId,
          variantKey: orderLine.variantKey,
          onHandQty: { gte: orderLine.quantity },
          location: { status: "ACTIVE", isPickable: true }
        },
        orderBy: [{ onHandQty: "desc" }]
      });
      const sortedBalances = [...candidateBalances].sort((left, right) => {
        const leftPriority = pickPriority.get(left.locationId) ?? Number.MAX_SAFE_INTEGER;
        const rightPriority = pickPriority.get(right.locationId) ?? Number.MAX_SAFE_INTEGER;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return right.onHandQty - left.onHandQty;
      });
      const balance = sortedBalances.find((item) => availableQuantity(item) >= orderLine.quantity);
      if (!balance) {
        throw new AppError("No pickable stock location can satisfy an order line.", 409);
      }
      lines.push({
        sourceLocationId: balance.locationId,
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
        type: "PICK",
        status: "OPEN",
        sourceOrderId: order.id,
        createdById: context.user.id,
        lines: { create: lines }
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
