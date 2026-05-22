import { describe, expect, it } from "vitest";
import { parseProductImportCsv } from "@/server/services/productImportService";

describe("product CSV import parser", () => {
  it("parses products, variants, and extra barcode lists", () => {
    const result = parseProductImportCsv(
      [
        "sku,name,barcode,barcodes,variant_sku,variant_name,variant_barcode,variant_barcodes",
        'sku-1,"Товар, большой",111,"111-A;111-B",sku-1-blue,Синий,222,"222-A|222-B"'
      ].join("\n")
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      sku: "SKU-1",
      name: "Товар, большой",
      barcode: "111",
      extraBarcodes: ["111-A", "111-B"],
      variantSku: "SKU-1-BLUE",
      variantName: "Синий",
      variantBarcode: "222",
      variantExtraBarcodes: ["222-A", "222-B"]
    });
  });

  it("returns row-level Russian validation errors", () => {
    const result = parseProductImportCsv(["sku,name", ",Без SKU"].join("\n"));
    expect(result.errors).toEqual([{ row: 2, message: "Укажите SKU товара." }]);
  });

  it("rejects duplicate barcodes inside one file", () => {
    const result = parseProductImportCsv(["sku,name,barcode", "SKU-1,Товар,ABC", "SKU-2,Другой,ABC"].join("\n"));
    expect(result.errors).toEqual([{ row: 3, message: "Штрихкод ABC уже есть в строке 2." }]);
  });

  it("reports missing required headers", () => {
    const result = parseProductImportCsv("sku,barcode\nSKU-1,111");
    expect(result.errors).toEqual([{ row: 1, message: "Нет колонки name." }]);
  });
});
