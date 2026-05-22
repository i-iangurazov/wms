import type { AdjustmentReason } from "@prisma/client";
import { AppError } from "@/server/errors";
import type { StockStateDelta } from "@/server/services/stockMovementEngine";

export type AdjustmentTargetState = "ON_HAND" | "DAMAGED" | "BLOCKED";

export function assertAdjustmentDelta(quantityDelta: number) {
  if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
    throw new AppError("Adjustment quantity delta must be a non-zero whole number.", 400);
  }
}

export function assertManualCorrectionNote(reason: AdjustmentReason, note?: string | null) {
  if (reason === "MANUAL_CORRECTION" && !note?.trim()) {
    throw new AppError("Manual correction requires a note.", 400);
  }
}

export function adjustmentMovementSides(input: { locationId: string; quantityDelta: number }) {
  assertAdjustmentDelta(input.quantityDelta);
  return input.quantityDelta > 0
    ? { toLocationId: input.locationId, fromLocationId: undefined, quantity: input.quantityDelta }
    : { fromLocationId: input.locationId, toLocationId: undefined, quantity: Math.abs(input.quantityDelta) };
}

export function parseAdjustmentTargetState(value: unknown): AdjustmentTargetState {
  if (value === undefined || value === null || value === "") {
    return "ON_HAND";
  }
  if (value === "ON_HAND" || value === "DAMAGED" || value === "BLOCKED") {
    return value;
  }
  throw new AppError("Invalid adjustment target state.", 400);
}

export function adjustmentStockStateDelta(input: {
  targetState: AdjustmentTargetState;
  quantityDelta: number;
}): StockStateDelta {
  assertAdjustmentDelta(input.quantityDelta);
  if (input.targetState === "DAMAGED") {
    return { damagedQty: input.quantityDelta };
  }
  if (input.targetState === "BLOCKED") {
    return { blockedQty: input.quantityDelta };
  }
  return { onHandQty: input.quantityDelta };
}
