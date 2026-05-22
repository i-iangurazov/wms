import type { AdjustmentReason, InventoryMovementType, Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export const BASE_VARIANT_KEY = "BASE";

export type StockState = {
  onHandQty: number;
  reservedQty: number;
  pickedQty: number;
  damagedQty: number;
  blockedQty: number;
};

export type StockStateDelta = Partial<StockState>;

export const emptyStockState: StockState = {
  onHandQty: 0,
  reservedQty: 0,
  pickedQty: 0,
  damagedQty: 0,
  blockedQty: 0
};

export function variantKey(variantId?: string | null) {
  return variantId ?? BASE_VARIANT_KEY;
}

export function assertSameStore(contextStoreId: string, recordStoreId: string, label: string) {
  if (contextStoreId !== recordStoreId) {
    throw new AppError(`${label} belongs to another store.`, 403);
  }
}

export function assertPositiveQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError("Quantity must be a positive whole number.", 400);
  }
}

export function canAllowNegativeStock(input: {
  role: Role;
  type: InventoryMovementType;
  reason?: AdjustmentReason | null;
  allowNegative?: boolean;
}) {
  return (
    input.allowNegative === true &&
    (input.role === "OWNER" || input.role === "ADMIN") &&
    input.type === "ADJUSTMENT" &&
    input.reason === "MANUAL_CORRECTION"
  );
}

export function nextQuantity(input: {
  currentQuantity: number;
  delta: number;
  allowNegative: boolean;
}) {
  const next = input.currentQuantity + input.delta;
  if (next < 0 && !input.allowNegative) {
    throw new AppError("Insufficient stock at source location.", 409);
  }
  return next;
}

export function availableQuantity(input: {
  onHandQty: number;
  reservedQty?: number;
  pickedQty?: number;
  damagedQty?: number;
  blockedQty?: number;
}) {
  return (
    input.onHandQty -
    (input.reservedQty ?? 0) -
    (input.pickedQty ?? 0) -
    (input.damagedQty ?? 0) -
    (input.blockedQty ?? 0)
  );
}

export function unavailableQuantity(input: {
  reservedQty?: number;
  pickedQty?: number;
  damagedQty?: number;
  blockedQty?: number;
}) {
  return (input.reservedQty ?? 0) + (input.pickedQty ?? 0) + (input.damagedQty ?? 0) + (input.blockedQty ?? 0);
}

export function stockStateFromBalance(input: {
  onHandQty: number;
  reservedQty: number;
  pickedQty: number;
  damagedQty: number;
  blockedQty: number;
}) {
  return {
    onHandQty: input.onHandQty,
    reservedQty: input.reservedQty,
    pickedQty: input.pickedQty,
    damagedQty: input.damagedQty,
    blockedQty: input.blockedQty
  };
}

export function nextStockState(input: {
  current: StockState;
  delta: StockStateDelta;
  allowNegative: boolean;
}) {
  const next: StockState = {
    onHandQty: input.current.onHandQty + (input.delta.onHandQty ?? 0),
    reservedQty: input.current.reservedQty + (input.delta.reservedQty ?? 0),
    pickedQty: input.current.pickedQty + (input.delta.pickedQty ?? 0),
    damagedQty: input.current.damagedQty + (input.delta.damagedQty ?? 0),
    blockedQty: input.current.blockedQty + (input.delta.blockedQty ?? 0)
  };

  const hasNegativeComponent = Object.values(next).some((value) => value < 0);
  const hasNegativeAvailability = availableQuantity(next) < 0;
  if ((hasNegativeComponent || hasNegativeAvailability) && !input.allowNegative) {
    throw new AppError("Insufficient stock at source location.", 409);
  }

  return next;
}

export function nextOnHandQuantity(input: {
  currentOnHandQty: number;
  currentAvailableQty: number;
  delta: number;
  allowNegative: boolean;
}) {
  const nextOnHandQty = input.currentOnHandQty + input.delta;
  const nextAvailableQty = input.currentAvailableQty + input.delta;
  if ((nextOnHandQty < 0 || nextAvailableQty < 0) && !input.allowNegative) {
    throw new AppError("Insufficient stock at source location.", 409);
  }
  return nextOnHandQty;
}

export function movementDeltas(input: {
  quantity: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
}) {
  assertPositiveQuantity(input.quantity);
  if (!input.fromLocationId && !input.toLocationId) {
    throw new AppError("Movement requires a source or destination location.", 400);
  }
  if (input.fromLocationId && input.toLocationId && input.fromLocationId === input.toLocationId) {
    throw new AppError("Source and destination locations must be different.", 400);
  }
  return {
    fromDelta: input.fromLocationId ? -input.quantity : 0,
    toDelta: input.toLocationId ? input.quantity : 0
  };
}
