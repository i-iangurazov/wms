import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  assertBarcodeLabelType,
  barcodePermissionForType,
  exportBarcodeLabelsCsv,
  normalizeBarcodeLabelCode
} from "@/server/services/barcodeLabelService";

describe("barcode label service helpers", () => {
  it("normalizes scanned label codes", () => {
    expect(normalizeBarcodeLabelCode("\t BOX-001 \n")).toBe("BOX-001");
  });

  it("rejects empty and overly long label codes", () => {
    expect(() => normalizeBarcodeLabelCode("  ")).toThrow(AppError);
    expect(() => normalizeBarcodeLabelCode("x".repeat(121))).toThrow(AppError);
  });

  it("validates supported label target types", () => {
    expect(assertBarcodeLabelType("product_variant")).toBe("PRODUCT_VARIANT");
    expect(() => assertBarcodeLabelType("supplier")).toThrow(AppError);
  });

  it("uses warehouse permission for location labels and barcode permission for other labels", () => {
    expect(barcodePermissionForType("LOCATION")).toBe("wms.manageLocations");
    expect(barcodePermissionForType("PRODUCT")).toBe("barcodes.manage");
  });

  it("exports CSV with escaped label values", () => {
    const csv = exportBarcodeLabelsCsv([
      {
        code: 'ABC"1',
        type: "PRODUCT",
        note: "Основной",
        product: { sku: "SKU-1", name: "Товар" },
        variant: null,
        location: null,
        order: null,
        work: null
      }
    ] as never);
    expect(csv).toContain('"ABC""1","PRODUCT","SKU-1 · Товар","Основной"');
  });
});
