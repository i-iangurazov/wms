import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";
import { availableQuantity, variantKey } from "@/server/services/stockMovementEngine";
import {
  assertLocationScanMatches,
  assertProductScanMatches,
  headerStatusForLineStatuses
} from "@/server/services/pickingRules";

function assertMinMax(input: { minQty: number; maxQty: number }) {
  if (!Number.isInteger(input.minQty) || input.minQty < 0) {
    throw new AppError("Replenishment minimum must be zero or greater.", 400);
  }
  if (!Number.isInteger(input.maxQty) || input.maxQty <= input.minQty) {
    throw new AppError("Replenishment maximum must be greater than minimum.", 400);
  }
}

function assertReplenishmentQuantity(input: { requested: number; remaining: number }) {
  if (!Number.isInteger(input.requested) || input.requested <= 0) {
    throw new AppError("Replenishment quantity must be a positive whole number.", 400);
  }
  if (input.requested > input.remaining) {
    throw new AppError("Replenishment quantity exceeds remaining work quantity.", 409);
  }
}

export async function listReplenishment(context: RequestContext) {
  requirePermission(context.role, "putaway.execute");
  const [rules, work, warehouses, locations, zones, products] = await Promise.all([
    prisma.replenishmentRule.findMany({
      where: { storeId: context.storeId },
      include: {
        warehouse: true,
        product: true,
        variant: true,
        pickLocation: true,
        sourceLocation: true,
        sourceZone: true
      },
      orderBy: [{ active: "desc" }, { warehouse: { code: "asc" } }, { pickLocation: { code: "asc" } }]
    }),
    prisma.warehouseWork.findMany({
      where: { storeId: context.storeId, type: "REPLENISHMENT" },
      include: {
        warehouse: true,
        replenishmentRule: true,
        lines: {
          include: { sourceLocation: true, destinationLocation: true, product: true, variant: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.warehouse.findMany({ where: { storeId: context.storeId }, orderBy: { code: "asc" } }),
    prisma.warehouseLocation.findMany({
      where: { storeId: context.storeId },
      orderBy: [{ warehouse: { code: "asc" } }, { code: "asc" }]
    }),
    prisma.warehouseZone.findMany({
      where: { storeId: context.storeId },
      orderBy: [{ warehouse: { code: "asc" } }, { code: "asc" }]
    }),
    prisma.product.findMany({ where: { storeId: context.storeId, active: true }, orderBy: { sku: "asc" } })
  ]);
  return { rules, work, warehouses, locations, zones, products };
}

export async function createReplenishmentRule(
  context: RequestContext,
  input: {
    warehouseId: string;
    productId: string;
    variantId?: string | null;
    pickLocationId: string;
    sourceLocationId?: string | null;
    sourceZoneId?: string | null;
    minQty: number;
    maxQty: number;
  }
) {
  requirePermission(context.role, "wms.manageLocations");
  assertMinMax(input);
  if (!input.sourceLocationId && !input.sourceZoneId) {
    throw new AppError("Replenishment source is required.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const [warehouse, product, pickLocation] = await Promise.all([
      tx.warehouse.findFirst({ where: { id: input.warehouseId, storeId: context.storeId, status: "ACTIVE" } }),
      tx.product.findFirst({ where: { id: input.productId, storeId: context.storeId, active: true } }),
      tx.warehouseLocation.findFirst({
        where: {
          id: input.pickLocationId,
          storeId: context.storeId,
          warehouseId: input.warehouseId,
          status: "ACTIVE",
          isPickable: true
        }
      })
    ]);
    if (!warehouse) {
      throw new AppError("Active warehouse not found.", 404);
    }
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
    if (!pickLocation) {
      throw new AppError("Pick location not found.", 404);
    }
    if (input.variantId) {
      const variant = await tx.productVariant.findFirst({
        where: { id: input.variantId, storeId: context.storeId, productId: product.id, active: true }
      });
      if (!variant) {
        throw new AppError("Product variant not found.", 404);
      }
    }

    let sourceLocationId = input.sourceLocationId ?? null;
    let sourceZoneId = input.sourceZoneId ?? null;
    if (sourceLocationId) {
      const sourceLocation = await tx.warehouseLocation.findFirst({
        where: {
          id: sourceLocationId,
          storeId: context.storeId,
          warehouseId: warehouse.id,
          status: "ACTIVE"
        }
      });
      if (!sourceLocation) {
        throw new AppError("Source location not found.", 404);
      }
      if (sourceLocation.id === pickLocation.id) {
        throw new AppError("Replenishment source and pick location must be different.", 400);
      }
      sourceZoneId = null;
    } else {
      const sourceZone = await tx.warehouseZone.findFirst({
        where: { id: sourceZoneId ?? "", storeId: context.storeId, warehouseId: warehouse.id, status: "ACTIVE" }
      });
      if (!sourceZone) {
        throw new AppError("Warehouse zone not found.", 404);
      }
      sourceLocationId = null;
    }

    const rule = await tx.replenishmentRule.create({
      data: {
        storeId: context.storeId,
        warehouseId: warehouse.id,
        productId: product.id,
        variantId: input.variantId ?? null,
        variantKey: variantKey(input.variantId),
        pickLocationId: pickLocation.id,
        sourceLocationId,
        sourceZoneId,
        minQty: input.minQty,
        maxQty: input.maxQty
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "replenishment_rule.create",
      entityType: "ReplenishmentRule",
      entityId: rule.id,
      metadata: { warehouseId: rule.warehouseId, productId: rule.productId, minQty: rule.minQty, maxQty: rule.maxQty }
    });
    return rule;
  });
}

export async function deactivateReplenishmentRule(context: RequestContext, id: string) {
  requirePermission(context.role, "wms.manageLocations");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.replenishmentRule.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Replenishment rule not found.", 404);
    }
    const rule = await tx.replenishmentRule.update({ where: { id }, data: { active: false } });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "replenishment_rule.deactivate",
      entityType: "ReplenishmentRule",
      entityId: rule.id
    });
    return rule;
  });
}

export async function generateReplenishmentWork(context: RequestContext, ruleId: string) {
  requirePermission(context.role, "putaway.execute");
  return prisma.$transaction(async (tx) => {
    const rule = await tx.replenishmentRule.findFirst({
      where: { id: ruleId, storeId: context.storeId, active: true },
      include: { pickLocation: true, product: true, variant: true }
    });
    if (!rule) {
      throw new AppError("Replenishment rule not found.", 404);
    }
    const openWork = await tx.warehouseWork.findFirst({
      where: {
        storeId: context.storeId,
        type: "REPLENISHMENT",
        replenishmentRuleId: rule.id,
        status: { in: ["OPEN", "IN_PROGRESS"] }
      }
    });
    if (openWork) {
      throw new AppError("Open replenishment work already exists.", 409);
    }
    const pickBalance = await tx.inventoryLocationBalance.findUnique({
      where: {
        storeId_locationId_productId_variantKey: {
          storeId: context.storeId,
          locationId: rule.pickLocationId,
          productId: rule.productId,
          variantKey: rule.variantKey
        }
      }
    });
    const pickAvailable = pickBalance ? availableQuantity(pickBalance) : 0;
    if (pickAvailable >= rule.minQty) {
      throw new AppError("Replenishment is not needed.", 409);
    }

    const sourceBalances = await tx.inventoryLocationBalance.findMany({
      where: {
        storeId: context.storeId,
        warehouseId: rule.warehouseId,
        productId: rule.productId,
        variantKey: rule.variantKey,
        locationId: rule.sourceLocationId ? rule.sourceLocationId : { not: rule.pickLocationId },
        location: {
          status: "ACTIVE",
          ...(rule.sourceZoneId ? { zoneId: rule.sourceZoneId } : {})
        }
      },
      include: { location: true },
      orderBy: [{ onHandQty: "desc" }]
    });
    const source = sourceBalances.find((balance) => availableQuantity(balance) > 0);
    if (!source) {
      throw new AppError("No stock available for replenishment.", 409);
    }

    const requiredQty = rule.maxQty - pickAvailable;
    const quantity = Math.min(requiredQty, availableQuantity(source));
    if (quantity <= 0) {
      throw new AppError("No stock available for replenishment.", 409);
    }

    const work = await tx.warehouseWork.create({
      data: {
        storeId: context.storeId,
        warehouseId: rule.warehouseId,
        type: "REPLENISHMENT",
        status: "OPEN",
        replenishmentRuleId: rule.id,
        createdById: context.user.id,
        lines: {
          create: {
            sourceLocationId: source.locationId,
            destinationLocationId: rule.pickLocationId,
            productId: rule.productId,
            variantId: rule.variantId,
            variantKey: rule.variantKey,
            quantity
          }
        }
      },
      include: { lines: true }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work.create_replenishment",
      entityType: "WarehouseWork",
      entityId: work.id,
      metadata: { ruleId: rule.id, quantity }
    });
    return work;
  });
}

export async function confirmReplenishmentLine(
  context: RequestContext,
  input: { lineId: string; sourceScan: string; destinationScan: string; productScan: string; quantity: number }
) {
  requirePermission(context.role, "putaway.execute");
  return prisma.$transaction(async (tx) => {
    const line = await tx.warehouseWorkLine.findUnique({
      where: { id: input.lineId },
      include: {
        work: { include: { lines: true } },
        sourceLocation: true,
        destinationLocation: true,
        product: true,
        variant: true
      }
    });
    if (!line || line.work.storeId !== context.storeId || line.work.type !== "REPLENISHMENT") {
      throw new AppError("Replenishment line not found.", 404);
    }
    if (!line.destinationLocation) {
      throw new AppError("Replenishment destination not found.", 404);
    }
    if (line.status === "COMPLETED") {
      throw new AppError("Replenishment line is already completed.", 409);
    }

    assertLocationScanMatches(input.sourceScan, line.sourceLocation);
    assertLocationScanMatches(input.destinationScan, line.destinationLocation);
    assertProductScanMatches(input.productScan, line.product, line.variant);
    const remaining = line.quantity - line.completedQuantity;
    assertReplenishmentQuantity({ requested: input.quantity, remaining });

    await applyStockMovementInTransaction(tx, context, {
      productId: line.productId,
      variantId: line.variantId,
      type: "TRANSFER",
      quantity: input.quantity,
      fromLocationId: line.sourceLocationId,
      toLocationId: line.destinationLocationId,
      note: "Пополнение ячейки сборки",
      referenceType: "WarehouseWorkLine",
      referenceId: line.id
    });

    const completedQuantity = line.completedQuantity + input.quantity;
    const lineStatus = completedQuantity >= line.quantity ? "COMPLETED" : "IN_PROGRESS";
    const updatedLine = await tx.warehouseWorkLine.update({
      where: { id: line.id },
      data: {
        completedQuantity,
        status: lineStatus,
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
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work_line.replenish",
      entityType: "WarehouseWorkLine",
      entityId: line.id,
      metadata: { quantity: input.quantity, status: lineStatus }
    });
    return updatedLine;
  });
}
