import type {
  AdjustmentReason,
  InventoryMovementType,
  Prisma,
  WarehouseLocation
} from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { RequestContext } from "@/server/auth";
import { requirePermission } from "@/server/permissions";
import {
  assertPositiveQuantity,
  assertSameStore,
  availableQuantity,
  canAllowNegativeStock,
  emptyStockState,
  movementDeltas,
  nextStockState,
  stockStateFromBalance,
  type StockStateDelta,
  unavailableQuantity,
  variantKey
} from "@/server/services/stockMovementEngine";
import { writeAuditLog } from "@/server/services/auditService";

export type MovementInput = {
  productId: string;
  variantId?: string | null;
  type: InventoryMovementType;
  quantity: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  reason?: AdjustmentReason | null;
  note?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  allowNegative?: boolean;
  stockStateLocationId?: string | null;
  stockStateDelta?: StockStateDelta | null;
  idempotencyKey?: string | null;
};

function requireMovementPermission(context: RequestContext, input: MovementInput) {
  if (input.type === "RECEIVE") {
    requirePermission(context.role, "WMS_RECEIVE_STOCK");
    return;
  }
  if (input.type === "ADJUSTMENT") {
    requirePermission(context.role, "WMS_ADJUST_STOCK");
    return;
  }
  if (input.type === "CYCLE_COUNT_CORRECTION") {
    requirePermission(context.role, "WMS_APPROVE_CYCLE_COUNT");
    return;
  }
  if (input.type === "PICK") {
    requirePermission(context.role, "WMS_PICK");
    return;
  }
  requirePermission(context.role, "WMS_MOVE_STOCK");
}

async function loadLocation(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  id: string | null | undefined,
  label: string
) {
  if (!id) {
    return null;
  }
  const location = await tx.warehouseLocation.findUnique({ where: { id } });
  if (!location) {
    throw new AppError(`${label} location not found.`, 404);
  }
  assertSameStore(context.storeId, location.storeId, `${label} location`);
  if (location.status !== "ACTIVE") {
    throw new AppError(`${label} location is inactive.`, 409);
  }
  return location;
}

async function adjustBalance(
  tx: Prisma.TransactionClient,
  input: {
    context: RequestContext;
    location: WarehouseLocation;
    productId: string;
    variantId?: string | null;
    delta: StockStateDelta;
    allowNegative: boolean;
  }
) {
  const key = variantKey(input.variantId);
  const where = {
    storeId_locationId_productId_variantKey: {
      storeId: input.context.storeId,
      locationId: input.location.id,
      productId: input.productId,
      variantKey: key
    }
  };
  const existing = await tx.inventoryLocationBalance.findUnique({ where });

  if (existing) {
    await tx.$queryRaw`SELECT id FROM inventory_location_balances WHERE id = ${existing.id} FOR UPDATE`;
    const nextState = nextStockState({
      current: stockStateFromBalance(existing),
      delta: input.delta,
      allowNegative: input.allowNegative
    });
    return tx.inventoryLocationBalance.update({
      where: { id: existing.id },
      data: { quantity: nextState.onHandQty, ...nextState }
    });
  }

  const nextState = nextStockState({
    current: emptyStockState,
    delta: input.delta,
    allowNegative: input.allowNegative
  });
  return tx.inventoryLocationBalance.create({
    data: {
      storeId: input.context.storeId,
      warehouseId: input.location.warehouseId,
      locationId: input.location.id,
      productId: input.productId,
      variantId: input.variantId ?? null,
      variantKey: key,
      quantity: nextState.onHandQty,
      ...nextState
    }
  });
}

async function appendInventoryMovement(
  tx: Prisma.TransactionClient,
  input: {
    context: RequestContext;
    productId: string;
    variantId?: string | null;
    type: InventoryMovementType;
    reason?: AdjustmentReason | null;
    quantity: number;
    fromLocation: WarehouseLocation | null;
    toLocation: WarehouseLocation | null;
    fromStateDelta?: StockStateDelta | null;
    toStateDelta?: StockStateDelta | null;
    note?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
  }
) {
  const fromStateDelta = input.fromStateDelta ?? {};
  const toStateDelta = input.toStateDelta ?? {};
  return tx.inventoryMovement.create({
    data: {
      storeId: input.context.storeId,
      warehouseId: input.toLocation?.warehouseId ?? input.fromLocation?.warehouseId ?? null,
      fromLocationId: input.fromLocation?.id ?? null,
      toLocationId: input.toLocation?.id ?? null,
      productId: input.productId,
      variantId: input.variantId ?? null,
      variantKey: variantKey(input.variantId),
      type: input.type,
      reason: input.reason ?? null,
      quantity: input.quantity,
      fromOnHandDelta: fromStateDelta.onHandQty ?? 0,
      fromReservedDelta: fromStateDelta.reservedQty ?? 0,
      fromPickedDelta: fromStateDelta.pickedQty ?? 0,
      fromDamagedDelta: fromStateDelta.damagedQty ?? 0,
      fromBlockedDelta: fromStateDelta.blockedQty ?? 0,
      toOnHandDelta: toStateDelta.onHandQty ?? 0,
      toReservedDelta: toStateDelta.reservedQty ?? 0,
      toPickedDelta: toStateDelta.pickedQty ?? 0,
      toDamagedDelta: toStateDelta.damagedQty ?? 0,
      toBlockedDelta: toStateDelta.blockedQty ?? 0,
      note: input.note ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      createdById: input.context.user.id
    }
  });
}

function idempotencyFingerprint(input: MovementInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        type: input.type,
        productId: input.productId,
        variantId: input.variantId ?? null,
        quantity: input.quantity,
        fromLocationId: input.fromLocationId ?? null,
        toLocationId: input.toLocationId ?? null,
        reason: input.reason ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        stockStateLocationId: input.stockStateLocationId ?? null,
        stockStateDelta: input.stockStateDelta ?? null
      })
    )
    .digest("hex");
}

async function claimIdempotencyKey(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  input: MovementInput
) {
  const key = input.idempotencyKey?.trim();
  if (!key) {
    return null;
  }
  if (key.length > 160) {
    throw new AppError("Idempotency key is too long.", 400);
  }
  const fingerprint = idempotencyFingerprint(input);
  const existing = await tx.stockCommand.findUnique({
    where: { storeId_idempotencyKey: { storeId: context.storeId, idempotencyKey: key } },
    include: { movement: true }
  });
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw new AppError("Idempotency key was already used for a different stock command.", 409);
    }
    if (!existing.movement) {
      throw new AppError("Stock command is already being processed.", 409);
    }
    return { commandId: existing.id, movement: existing.movement };
  }

  const command = await tx.stockCommand.create({
    data: {
      storeId: context.storeId,
      idempotencyKey: key,
      fingerprint,
      operation: input.type,
      createdById: context.user.id
    }
  });
  return { commandId: command.id, movement: null };
}

export async function applyStockMovementInTransaction(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  input: MovementInput
) {
  requireMovementPermission(context, input);
  assertPositiveQuantity(input.quantity);

  if (input.type === "ADJUSTMENT" && input.reason === "MANUAL_CORRECTION" && !input.note?.trim()) {
    throw new AppError("Manual correction requires a note.", 400);
  }

  const allowNegative = canAllowNegativeStock({
    role: context.role,
    type: input.type,
    reason: input.reason,
    allowNegative: input.allowNegative
  });

  const idempotency = await claimIdempotencyKey(tx, context, input);
  if (idempotency?.movement) {
    return idempotency.movement;
  }

  const product = await tx.product.findUnique({ where: { id: input.productId } });
  if (!product) {
    throw new AppError("Product not found.", 404);
  }
  assertSameStore(context.storeId, product.storeId, "Product");

  if (input.variantId) {
    const variant = await tx.productVariant.findUnique({ where: { id: input.variantId } });
    if (!variant || variant.productId !== product.id) {
      throw new AppError("Product variant not found.", 404);
    }
    assertSameStore(context.storeId, variant.storeId, "Product variant");
  }

  const fromLocation = await loadLocation(tx, context, input.fromLocationId, "Source");
  const toLocation = await loadLocation(tx, context, input.toLocationId, "Destination");
  if (Boolean(input.stockStateLocationId) !== Boolean(input.stockStateDelta)) {
    throw new AppError("Stock state adjustment requires a target location and delta.", 400);
  }
  const stockStateLocation = await loadLocation(tx, context, input.stockStateLocationId, "Target");
  if (stockStateLocation && (fromLocation || toLocation)) {
    throw new AppError("Stock state adjustment cannot also move stock.", 400);
  }
  const { fromDelta, toDelta } = stockStateLocation
    ? { fromDelta: 0, toDelta: 0 }
    : movementDeltas({
        quantity: input.quantity,
        fromLocationId: fromLocation?.id,
        toLocationId: toLocation?.id
      });

  if (fromLocation && fromDelta !== 0) {
    const fromStateDelta = { onHandQty: fromDelta };
    await adjustBalance(tx, {
      context,
      location: fromLocation,
      productId: product.id,
      variantId: input.variantId,
      delta: fromStateDelta,
      allowNegative
    });
  }

  if (toLocation && toDelta !== 0) {
    const toStateDelta = { onHandQty: toDelta };
    await adjustBalance(tx, {
      context,
      location: toLocation,
      productId: product.id,
      variantId: input.variantId,
      delta: toStateDelta,
      allowNegative
    });
  }

  if (stockStateLocation && input.stockStateDelta) {
    await adjustBalance(tx, {
      context,
      location: stockStateLocation,
      productId: product.id,
      variantId: input.variantId,
      delta: input.stockStateDelta,
      allowNegative
    });
  }

  const movement = await appendInventoryMovement(tx, {
    context,
    productId: product.id,
    variantId: input.variantId,
    type: input.type,
    reason: input.reason,
    quantity: input.quantity,
    fromLocation,
    toLocation: toLocation ?? stockStateLocation,
    fromStateDelta: fromLocation && fromDelta !== 0 ? { onHandQty: fromDelta } : undefined,
    toStateDelta: stockStateLocation ? input.stockStateDelta : toLocation && toDelta !== 0 ? { onHandQty: toDelta } : undefined,
    note: input.note,
    referenceType: input.referenceType,
    referenceId: input.referenceId
  });

  await writeAuditLog(tx, {
    storeId: context.storeId,
    userId: context.user.id,
    action: "inventory_movement.create",
    entityType: "InventoryMovement",
    entityId: movement.id,
    metadata: {
      type: movement.type,
      quantity: movement.quantity,
      fromLocationId: movement.fromLocationId,
      toLocationId: movement.toLocationId
    }
  });

  if (idempotency) {
    await tx.stockCommand.update({
      where: { id: idempotency.commandId },
      data: { movementId: movement.id }
    });
  }

  return movement;
}

export async function applyStockMovement(context: RequestContext, input: MovementInput) {
  return prisma.$transaction((tx) => applyStockMovementInTransaction(tx, context, input));
}

export async function listInventoryBalances(
  context: RequestContext,
  filters: { warehouseId?: string; locationId?: string; productId?: string }
) {
  requirePermission(context.role, "WMS_VIEW");
  const balances = await prisma.inventoryLocationBalance.findMany({
    where: {
      storeId: context.storeId,
      warehouseId: filters.warehouseId,
      locationId: filters.locationId,
      productId: filters.productId
    },
    include: {
      warehouse: true,
      location: true,
      product: true,
      variant: true
    },
    orderBy: [{ warehouse: { code: "asc" } }, { location: { code: "asc" } }, { product: { sku: "asc" } }]
  });
  return balances.map((balance) => ({
    ...balance,
    quantity: balance.onHandQty,
    availableQty: availableQuantity(balance),
    unavailableQty: unavailableQuantity(balance)
  }));
}

export async function listInventoryMovements(
  context: RequestContext,
  filters: { warehouseId?: string; locationId?: string; productId?: string }
) {
  requirePermission(context.role, "WMS_VIEW");
  return prisma.inventoryMovement.findMany({
    where: {
      storeId: context.storeId,
      warehouseId: filters.warehouseId,
      productId: filters.productId,
      OR: filters.locationId
        ? [{ fromLocationId: filters.locationId }, { toLocationId: filters.locationId }]
        : undefined
    },
    include: {
      warehouse: true,
      fromLocation: true,
      toLocation: true,
      product: true,
      variant: true,
      createdBy: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
}
