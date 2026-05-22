import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  assertLocationScanMatches,
  assertPickQuantity,
  assertProductScanMatches,
  headerStatusForLineStatuses,
  pickExceptionReason
} from "@/server/services/pickingRules";

describe("picking rules", () => {
  it("validates picked quantity against remaining work", () => {
    expect(() => assertPickQuantity({ requested: 1, remaining: 2 })).not.toThrow();
    expect(() => assertPickQuantity({ requested: 3, remaining: 2 })).toThrow(AppError);
  });

  it("requires matching location scan", () => {
    const location = { id: "loc-id", code: "A-01-01", barcode: "LOC-A-01-01" };
    expect(() => assertLocationScanMatches("A-01-01", location)).not.toThrow();
    expect(() => assertLocationScanMatches("WRONG", location)).toThrow(AppError);
  });

  it("requires matching product or variant scan", () => {
    const product = { id: "product-id", sku: "SKU-001", barcode: "0001" };
    const variant = { id: "variant-id", sku: "SKU-001-RED", barcode: "0001-R" };
    expect(() => assertProductScanMatches("SKU-001", product, variant)).not.toThrow();
    expect(() => assertProductScanMatches("SKU-001-RED", product, variant)).not.toThrow();
    expect(() => assertProductScanMatches("OTHER", product, variant)).toThrow(AppError);
  });

  it("rolls work header status from line statuses", () => {
    expect(headerStatusForLineStatuses(["OPEN", "OPEN"])).toBe("OPEN");
    expect(headerStatusForLineStatuses(["COMPLETED", "OPEN"])).toBe("IN_PROGRESS");
    expect(headerStatusForLineStatuses(["COMPLETED", "COMPLETED"])).toBe("COMPLETED");
  });

  it("marks partial picks for review and clears the marker when complete", () => {
    expect(pickExceptionReason({ pickedQuantity: 0, requiredQuantity: 5 })).toBeNull();
    expect(pickExceptionReason({ pickedQuantity: 3, requiredQuantity: 5 })).toBe("SHORT_PICK_REVIEW");
    expect(pickExceptionReason({ pickedQuantity: 5, requiredQuantity: 5 })).toBeNull();
  });
});
