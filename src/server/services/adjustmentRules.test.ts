import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  adjustmentMovementSides,
  adjustmentStockStateDelta,
  assertAdjustmentDelta,
  assertManualCorrectionNote,
  parseAdjustmentTargetState
} from "@/server/services/adjustmentRules";
import { movementDeltas } from "@/server/services/stockMovementEngine";

describe("transfer and adjustment rules", () => {
  it("rejects transfer to the same location", () => {
    expect(() => movementDeltas({ quantity: 1, fromLocationId: "loc", toLocationId: "loc" })).toThrow(AppError);
  });

  it("requires non-zero adjustment deltas", () => {
    expect(() => assertAdjustmentDelta(0)).toThrow(AppError);
    expect(() => assertAdjustmentDelta(2)).not.toThrow();
    expect(() => assertAdjustmentDelta(-2)).not.toThrow();
  });

  it("requires a note for manual corrections", () => {
    expect(() => assertManualCorrectionNote("MANUAL_CORRECTION", "")).toThrow(AppError);
    expect(() => assertManualCorrectionNote("MANUAL_CORRECTION", "cycle recount approved")).not.toThrow();
    expect(() => assertManualCorrectionNote("DAMAGED", "")).not.toThrow();
  });

  it("maps signed adjustment deltas to source or destination movement sides", () => {
    expect(adjustmentMovementSides({ locationId: "loc", quantityDelta: 3 })).toEqual({
      toLocationId: "loc",
      fromLocationId: undefined,
      quantity: 3
    });
    expect(adjustmentMovementSides({ locationId: "loc", quantityDelta: -3 })).toEqual({
      fromLocationId: "loc",
      toLocationId: undefined,
      quantity: 3
    });
  });

  it("maps damaged and blocked adjustment targets to stock-state deltas", () => {
    expect(parseAdjustmentTargetState(undefined)).toBe("ON_HAND");
    expect(parseAdjustmentTargetState("DAMAGED")).toBe("DAMAGED");
    expect(() => parseAdjustmentTargetState("RESERVED")).toThrow(AppError);
    expect(adjustmentStockStateDelta({ targetState: "DAMAGED", quantityDelta: 2 })).toEqual({ damagedQty: 2 });
    expect(adjustmentStockStateDelta({ targetState: "BLOCKED", quantityDelta: -1 })).toEqual({ blockedQty: -1 });
  });
});
