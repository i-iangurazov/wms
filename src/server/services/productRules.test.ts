import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  assertProductName,
  assertProductSku,
  normalizeOptionalBarcode,
  normalizeSku
} from "@/server/services/productRules";

describe("product rules", () => {
  it("normalizes SKU values for scanner-safe lookup", () => {
    expect(normalizeSku(" sku 001 ")).toBe("SKU-001");
  });

  it("normalizes optional barcodes", () => {
    expect(normalizeOptionalBarcode(" 12345 ")).toBe("12345");
    expect(normalizeOptionalBarcode("   ")).toBeNull();
  });

  it("requires SKU and product name", () => {
    expect(() => assertProductSku("")).toThrow(AppError);
    expect(() => assertProductName("")).toThrow(AppError);
    expect(assertProductSku("abc")).toBe("ABC");
    expect(assertProductName(" Товар ")).toBe("Товар");
  });
});
