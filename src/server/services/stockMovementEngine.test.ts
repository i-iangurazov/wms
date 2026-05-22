import { describe, expect, it } from "vitest";
import {
  assertSameStore,
  availableQuantity,
  canAllowNegativeStock,
  movementDeltas,
  nextStockState,
  nextOnHandQuantity,
  nextQuantity,
  unavailableQuantity,
  variantKey
} from "@/server/services/stockMovementEngine";
import { AppError } from "@/server/errors";

describe("stock movement engine", () => {
  it("plans stock increase for a receive-like movement", () => {
    expect(movementDeltas({ quantity: 5, toLocationId: "loc-1" })).toEqual({
      fromDelta: 0,
      toDelta: 5
    });
    expect(nextQuantity({ currentQuantity: 0, delta: 5, allowNegative: false })).toBe(5);
  });

  it("plans transfer-like source and destination deltas", () => {
    expect(movementDeltas({ quantity: 4, fromLocationId: "src", toLocationId: "dst" })).toEqual({
      fromDelta: -4,
      toDelta: 4
    });
    expect(nextQuantity({ currentQuantity: 10, delta: -4, allowNegative: false })).toBe(6);
    expect(nextQuantity({ currentQuantity: 1, delta: 4, allowNegative: false })).toBe(5);
  });

  it("prevents negative stock by default", () => {
    expect(() => nextQuantity({ currentQuantity: 2, delta: -3, allowNegative: false })).toThrow(AppError);
  });

  it("calculates available quantity from physical and unavailable states", () => {
    const state = {
      onHandQty: 10,
      reservedQty: 2,
      pickedQty: 1,
      damagedQty: 3,
      blockedQty: 1
    };

    expect(availableQuantity(state)).toBe(3);
    expect(unavailableQuantity(state)).toBe(7);
  });

  it("prevents source movement when available stock is already reserved or blocked", () => {
    expect(() =>
      nextOnHandQuantity({
        currentOnHandQty: 10,
        currentAvailableQty: 2,
        delta: -3,
        allowNegative: false
      })
    ).toThrow(AppError);
    expect(
      nextOnHandQuantity({
        currentOnHandQty: 10,
        currentAvailableQty: 2,
        delta: -2,
        allowNegative: false
      })
    ).toBe(8);
  });

  it("applies stock-state deltas through one availability guard", () => {
    expect(
      nextStockState({
        current: { onHandQty: 10, reservedQty: 1, pickedQty: 0, damagedQty: 0, blockedQty: 0 },
        delta: { reservedQty: 2 },
        allowNegative: false
      })
    ).toEqual({ onHandQty: 10, reservedQty: 3, pickedQty: 0, damagedQty: 0, blockedQty: 0 });

    expect(() =>
      nextStockState({
        current: { onHandQty: 5, reservedQty: 4, pickedQty: 0, damagedQty: 0, blockedQty: 0 },
        delta: { blockedQty: 2 },
        allowNegative: false
      })
    ).toThrow(AppError);
  });

  it("allows negative stock only for explicit owner/admin manual correction", () => {
    expect(
      canAllowNegativeStock({
        role: "OWNER",
        type: "ADJUSTMENT",
        reason: "MANUAL_CORRECTION",
        allowNegative: true
      })
    ).toBe(true);
    expect(
      canAllowNegativeStock({
        role: "ADMIN",
        type: "ADJUSTMENT",
        reason: "MANUAL_CORRECTION",
        allowNegative: true
      })
    ).toBe(true);
    expect(
      canAllowNegativeStock({
        role: "MANAGER",
        type: "ADJUSTMENT",
        reason: "MANUAL_CORRECTION",
        allowNegative: true
      })
    ).toBe(false);
  });

  it("enforces store isolation before mutation", () => {
    expect(() => assertSameStore("store-a", "store-b", "Product")).toThrow(AppError);
    expect(() => assertSameStore("store-a", "store-a", "Product")).not.toThrow();
  });

  it("uses a stable key for base products without variants", () => {
    expect(variantKey(null)).toBe("BASE");
    expect(variantKey("variant-1")).toBe("variant-1");
  });
});
