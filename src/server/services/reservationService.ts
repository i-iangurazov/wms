import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";
import { availableQuantity } from "@/server/services/stockMovementEngine";
import { getPickLocationIdsByPriority } from "@/server/services/warehouseRuleService";

const activeReservationStatuses = ["RESERVED", "PICKING", "PICKED"] as const;

export async function listOrderReservations(context: RequestContext, filters: { orderId?: string }) {
  requirePermission(context.role, "picking.execute");
  return prisma.inventoryReservation.findMany({
    where: {
      storeId: context.storeId,
      orderLine: filters.orderId ? { orderId: filters.orderId } : undefined
    },
    include: {
      warehouse: true,
      location: true,
      orderLine: { include: { order: true, product: true, variant: true } },
      product: true,
      variant: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}

async function activeReservationsForOrder(tx: Prisma.TransactionClient, context: RequestContext, orderId: string) {
  return tx.inventoryReservation.findMany({
    where: {
      storeId: context.storeId,
      status: { in: [...activeReservationStatuses] },
      orderLine: { orderId }
    }
  });
}

export async function allocateOrderStock(
  context: RequestContext,
  input: { orderId: string; warehouseId: string; idempotencyKey?: string | null }
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
    const existingReservations = await activeReservationsForOrder(tx, context, order.id);
    if (existingReservations.length > 0) {
      if (input.idempotencyKey) {
        return existingReservations;
      }
      throw new AppError("Order already has active reservations.", 409);
    }
    if (order.status !== "OPEN") {
      throw new AppError("Order must be open before allocation.", 409);
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

    const pickLocationIdsByPriority = await getPickLocationIdsByPriority(tx, context, warehouse.id);
    const pickPriority = new Map(pickLocationIdsByPriority.map((locationId, index) => [locationId, index]));
    const reservations = [];

    for (const orderLine of order.lines) {
      let remaining = orderLine.quantity;
      const candidateBalances = await tx.inventoryLocationBalance.findMany({
        where: {
          storeId: context.storeId,
          warehouseId: warehouse.id,
          productId: orderLine.productId,
          variantKey: orderLine.variantKey,
          onHandQty: { gt: 0 },
          location: { status: "ACTIVE", isPickable: true }
        },
        include: { location: true },
        orderBy: [{ onHandQty: "desc" }]
      });
      const sortedBalances = [...candidateBalances].sort((left, right) => {
        const leftPriority = pickPriority.get(left.locationId) ?? Number.MAX_SAFE_INTEGER;
        const rightPriority = pickPriority.get(right.locationId) ?? Number.MAX_SAFE_INTEGER;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return availableQuantity(right) - availableQuantity(left);
      });

      for (const balance of sortedBalances) {
        if (remaining <= 0) {
          break;
        }
        const reservableQty = Math.min(remaining, availableQuantity(balance));
        if (reservableQty <= 0) {
          continue;
        }

        const movement = await applyStockMovementInTransaction(tx, context, {
          productId: orderLine.productId,
          variantId: orderLine.variantId,
          type: "RESERVE",
          quantity: reservableQty,
          stockStateLocationId: balance.locationId,
          stockStateDelta: { reservedQty: reservableQty },
          referenceType: "CustomerOrderLine",
          referenceId: orderLine.id,
          idempotencyKey: input.idempotencyKey
            ? `${input.idempotencyKey}:${orderLine.id}:${balance.locationId}:reserve`
            : null
        });

        const reservation = await tx.inventoryReservation.create({
          data: {
            storeId: context.storeId,
            warehouseId: warehouse.id,
            locationId: balance.locationId,
            orderLineId: orderLine.id,
            productId: orderLine.productId,
            variantId: orderLine.variantId,
            variantKey: orderLine.variantKey,
            quantity: reservableQty,
            status: "RESERVED",
            createdById: context.user.id
          }
        });
        reservations.push(reservation);
        remaining -= reservableQty;

        await writeAuditLog(tx, {
          storeId: context.storeId,
          userId: context.user.id,
          action: "inventory_reservation.create",
          entityType: "InventoryReservation",
          entityId: reservation.id,
          metadata: {
            orderId: order.id,
            orderLineId: orderLine.id,
            locationId: balance.locationId,
            quantity: reservableQty,
            movementId: movement.id
          }
        });
      }

      if (remaining > 0) {
        throw new AppError("Insufficient stock for order allocation.", 409);
      }
    }

    await tx.customerOrder.update({ where: { id: order.id }, data: { status: "ALLOCATED" } });
    return reservations;
  });
}

export async function releaseOrderReservations(
  context: RequestContext,
  input: { orderId: string; note?: string | null; idempotencyKey?: string | null }
) {
  requirePermission(context.role, "picking.create");

  return prisma.$transaction(async (tx) => {
    const order = await tx.customerOrder.findFirst({
      where: { id: input.orderId, storeId: context.storeId },
      include: { work: true }
    });
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    if (order.work.some((work) => work.type === "PICK" && work.status !== "CANCELLED")) {
      throw new AppError("Cannot release reservations after pick work was created.", 409);
    }

    const reservations = await tx.inventoryReservation.findMany({
      where: {
        storeId: context.storeId,
        status: "RESERVED",
        orderLine: { orderId: order.id }
      }
    });
    if (reservations.length === 0) {
      if (input.idempotencyKey) {
        return 0;
      }
      throw new AppError("No active reservations found.", 404);
    }

    for (const reservation of reservations) {
      const movement = await applyStockMovementInTransaction(tx, context, {
        productId: reservation.productId,
        variantId: reservation.variantId,
        type: "RELEASE_RESERVATION",
        quantity: reservation.quantity,
        stockStateLocationId: reservation.locationId,
        stockStateDelta: { reservedQty: -reservation.quantity },
        note: input.note,
        referenceType: "InventoryReservation",
        referenceId: reservation.id,
        idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:${reservation.id}:release` : null
      });
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: "RELEASED" }
      });
      await writeAuditLog(tx, {
        storeId: context.storeId,
        userId: context.user.id,
        action: "inventory_reservation.release",
        entityType: "InventoryReservation",
        entityId: reservation.id,
        metadata: { orderId: order.id, movementId: movement.id, note: input.note ?? null }
      });
    }

    await tx.customerOrder.update({ where: { id: order.id }, data: { status: "OPEN" } });
    return reservations.length;
  });
}
