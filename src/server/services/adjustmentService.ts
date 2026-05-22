import type { AdjustmentReason } from "@prisma/client";
import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { requirePermission } from "@/server/permissions";
import {
  type AdjustmentTargetState,
  adjustmentStockStateDelta,
  adjustmentMovementSides,
  assertManualCorrectionNote
} from "@/server/services/adjustmentRules";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";

export async function adjustStock(
  context: RequestContext,
  input: {
    locationId: string;
    productId: string;
    variantId?: string | null;
    quantityDelta: number;
    reason: AdjustmentReason;
    note?: string | null;
    allowNegative?: boolean;
    targetState?: AdjustmentTargetState;
    idempotencyKey?: string | null;
  }
) {
  requirePermission(context.role, "WMS_ADJUST_STOCK");
  assertManualCorrectionNote(input.reason, input.note);
  const targetState = input.targetState ?? "ON_HAND";
  const sides =
    targetState === "ON_HAND"
      ? adjustmentMovementSides({
          locationId: input.locationId,
          quantityDelta: input.quantityDelta
        })
      : { fromLocationId: undefined, toLocationId: undefined, quantity: Math.abs(input.quantityDelta) };
  const stockStateDelta =
    targetState === "ON_HAND"
      ? undefined
      : adjustmentStockStateDelta({ targetState, quantityDelta: input.quantityDelta });

  return prisma.$transaction((tx) =>
    applyStockMovementInTransaction(tx, context, {
      productId: input.productId,
      variantId: input.variantId,
      type: "ADJUSTMENT",
      quantity: sides.quantity,
      fromLocationId: sides.fromLocationId,
      toLocationId: sides.toLocationId,
      reason: input.reason,
      note: input.note,
      allowNegative: input.allowNegative,
      referenceType: "Adjustment",
      stockStateLocationId: targetState === "ON_HAND" ? undefined : input.locationId,
      stockStateDelta,
      idempotencyKey: input.idempotencyKey
    })
  );
}
