import type { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getRequestContext } from "@/server/auth";
import { jsonError } from "@/server/http";
import { requirePermission } from "@/server/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context.role, "products.manage");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "WMS";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("products");
    sheet.columns = [
      { header: "sku", key: "sku", width: 18 },
      { header: "name", key: "name", width: 32 },
      { header: "barcode", key: "barcode", width: 22 },
      { header: "barcodes", key: "barcodes", width: 30 },
      { header: "variant_sku", key: "variantSku", width: 20 },
      { header: "variant_name", key: "variantName", width: 26 },
      { header: "variant_barcode", key: "variantBarcode", width: 22 },
      { header: "variant_barcodes", key: "variantBarcodes", width: 30 }
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" }
    };
    sheet.addRow({
      sku: "SKU-001",
      name: "Название товара",
      barcode: "460000000001",
      barcodes: "ALT-001;ALT-002",
      variantSku: "SKU-001-BLACK",
      variantName: "Чёрный",
      variantBarcode: "460000000002",
      variantBarcodes: "ALT-VAR-001"
    });
    sheet.addRow({
      sku: "SKU-002",
      name: "Товар без вариантов",
      barcode: "460000000003"
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer as BodyInit, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="wms-product-import-template.xlsx"'
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
