import { AppError } from "@/server/errors";

export function normalizeSku(value: string) {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

export function normalizeOptionalBarcode(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function assertProductSku(value: string) {
  const sku = normalizeSku(value);
  if (!sku) {
    throw new AppError("Product SKU is required.", 400);
  }
  if (sku.length > 80) {
    throw new AppError("Product SKU is too long.", 400);
  }
  return sku;
}

export function assertProductName(value: string) {
  const name = value.trim();
  if (!name) {
    throw new AppError("Product name is required.", 400);
  }
  if (name.length > 160) {
    throw new AppError("Product name is too long.", 400);
  }
  return name;
}
