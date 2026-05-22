import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import {
  assertProductName,
  assertProductSku,
  normalizeOptionalBarcode
} from "@/server/services/productRules";
import {
  assertBarcodeLabelCodeAvailable,
  normalizeBarcodeLabelCode
} from "@/server/services/barcodeLabelService";

export type ProductImportError = {
  row: number;
  message: string;
};

export type ProductImportRow = {
  row: number;
  sku: string;
  name: string;
  barcode: string | null;
  extraBarcodes: string[];
  variantSku: string | null;
  variantName: string | null;
  variantBarcode: string | null;
  variantExtraBarcodes: string[];
};

const requiredHeaders = ["sku", "name"] as const;
const rowErrorMessages: Record<string, string> = {
  "Product SKU is required.": "Укажите SKU товара.",
  "Product SKU is too long.": "SKU товара слишком длинный.",
  "Product name is required.": "Укажите название товара.",
  "Product name is too long.": "Название товара слишком длинное.",
  "Barcode label code is required.": "Укажите код штрихкода.",
  "Barcode label code is too long.": "Код штрихкода слишком длинный."
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function splitBarcodeList(value: string | undefined) {
  if (!value) {
    return [];
  }
  return value
    .split(/[;|]/)
    .map((item) => normalizeBarcodeLabelCode(item))
    .filter(Boolean);
}

export function parseProductImportCsv(csv: string) {
  const errors: ProductImportError[] = [];
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 1, message: "Файл пустой." }] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      errors.push({ row: 1, message: `Нет колонки ${header}.` });
    }
  }
  if (errors.length > 0) {
    return { rows: [], errors };
  }

  const rows: ProductImportRow[] = [];
  const seenSkus = new Map<string, number>();
  const seenVariantSkus = new Map<string, number>();
  const seenBarcodes = new Map<string, number>();

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowNumber = lineIndex + 1;
    const values = parseCsvLine(lines[lineIndex]);
    const valueByHeader = new Map(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
    try {
      const sku = assertProductSku(valueByHeader.get("sku") ?? "");
      const name = assertProductName(valueByHeader.get("name") ?? "");
      const barcode = normalizeOptionalBarcode(valueByHeader.get("barcode"));
      const extraBarcodes = splitBarcodeList(valueByHeader.get("barcodes"));
      const variantSkuValue = valueByHeader.get("variant_sku")?.trim();
      const variantSku = variantSkuValue ? assertProductSku(variantSkuValue) : null;
      const variantName = variantSku ? assertProductName(valueByHeader.get("variant_name") ?? "") : null;
      const variantBarcode = variantSku ? normalizeOptionalBarcode(valueByHeader.get("variant_barcode")) : null;
      const variantExtraBarcodes = variantSku ? splitBarcodeList(valueByHeader.get("variant_barcodes")) : [];

      const previousSkuRow = seenSkus.get(sku);
      if (previousSkuRow && previousSkuRow !== rowNumber && !variantSku) {
        errors.push({ row: rowNumber, message: `SKU товара уже есть в строке ${previousSkuRow}.` });
      }
      seenSkus.set(sku, previousSkuRow ?? rowNumber);

      if (variantSku) {
        const previousVariantRow = seenVariantSkus.get(variantSku);
        if (previousVariantRow) {
          errors.push({ row: rowNumber, message: `SKU варианта уже есть в строке ${previousVariantRow}.` });
        }
        seenVariantSkus.set(variantSku, rowNumber);
      }

      const rowBarcodes = [barcode, ...extraBarcodes, variantBarcode, ...variantExtraBarcodes].filter(
        (item): item is string => Boolean(item)
      );
      for (const code of rowBarcodes) {
        const previousBarcodeRow = seenBarcodes.get(code);
        if (previousBarcodeRow) {
          errors.push({ row: rowNumber, message: `Штрихкод ${code} уже есть в строке ${previousBarcodeRow}.` });
        }
        seenBarcodes.set(code, rowNumber);
      }

      rows.push({
        row: rowNumber,
        sku,
        name,
        barcode,
        extraBarcodes,
        variantSku,
        variantName,
        variantBarcode,
        variantExtraBarcodes
      });
    } catch (error) {
      const message = error instanceof AppError ? rowErrorMessages[error.message] ?? error.message : "Некорректная строка.";
      errors.push({
        row: rowNumber,
        message
      });
    }
  }

  return { rows, errors };
}

async function assertNoExistingSkuOrBarcode(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  rows: ProductImportRow[]
) {
  for (const row of rows) {
    const productSkuConflict = await tx.product.findFirst({
      where: { storeId: context.storeId, sku: row.sku },
      select: { id: true }
    });
    if (productSkuConflict) {
      throw new AppError(`Строка ${row.row}: товар с SKU ${row.sku} уже есть.`, 409);
    }
    if (row.variantSku) {
      const variantSkuConflict = await tx.productVariant.findFirst({
        where: { storeId: context.storeId, sku: row.variantSku },
        select: { id: true }
      });
      if (variantSkuConflict) {
        throw new AppError(`Строка ${row.row}: вариант с SKU ${row.variantSku} уже есть.`, 409);
      }
    }
  }
}

export async function importProductsFromCsv(context: RequestContext, csv: string) {
  requirePermission(context.role, "WMS_MANAGE_PRODUCTS");
  const parsed = parseProductImportCsv(csv);
  if (parsed.errors.length > 0) {
    return { imported: 0, productsCreated: 0, variantsCreated: 0, errors: parsed.errors };
  }

  return prisma.$transaction(async (tx) => {
    await assertNoExistingSkuOrBarcode(tx, context, parsed.rows);
    const productsBySku = new Map<string, { id: string; sku: string }>();
    let productsCreated = 0;
    let variantsCreated = 0;

    for (const row of parsed.rows) {
      let product = productsBySku.get(row.sku);
      if (!product) {
        const created = await tx.product.create({
          data: {
            storeId: context.storeId,
            sku: row.sku,
            name: row.name,
            barcode: row.barcode
          }
        });
        product = { id: created.id, sku: created.sku };
        productsBySku.set(row.sku, product);
        productsCreated += 1;

        for (const code of row.extraBarcodes) {
          await assertBarcodeLabelCodeAvailable(tx, context, { code, type: "PRODUCT", targetId: product.id });
          await tx.barcodeLabel.create({
            data: { storeId: context.storeId, code, type: "PRODUCT", productId: product.id, createdById: context.user.id }
          });
        }
      }

      if (row.variantSku && row.variantName) {
        const variant = await tx.productVariant.create({
          data: {
            storeId: context.storeId,
            productId: product.id,
            sku: row.variantSku,
            name: row.variantName,
            barcode: row.variantBarcode
          }
        });
        variantsCreated += 1;
        for (const code of row.variantExtraBarcodes) {
          await assertBarcodeLabelCodeAvailable(tx, context, {
            code,
            type: "PRODUCT_VARIANT",
            targetId: variant.id
          });
          await tx.barcodeLabel.create({
            data: {
              storeId: context.storeId,
              code,
              type: "PRODUCT_VARIANT",
              variantId: variant.id,
              createdById: context.user.id
            }
          });
        }
      }
    }

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "product.import_csv",
      entityType: "Product",
      entityId: context.storeId,
      metadata: { productsCreated, variantsCreated }
    });

    return {
      imported: productsCreated + variantsCreated,
      productsCreated,
      variantsCreated,
      errors: []
    };
  });
}
