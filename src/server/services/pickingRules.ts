import { AppError } from "@/server/errors";

export function assertPickQuantity(input: { requested: number; remaining: number }) {
  if (!Number.isInteger(input.requested) || input.requested <= 0) {
    throw new AppError("Picked quantity must be a positive whole number.", 400);
  }
  if (input.requested > input.remaining) {
    throw new AppError("Picked quantity exceeds remaining work quantity.", 409);
  }
}

export function assertLocationScanMatches(scan: string, location: { id: string; code: string; barcode: string | null }) {
  if (scan !== location.id && scan !== location.code && scan !== location.barcode) {
    throw new AppError("Scanned location does not match the pick line source.", 409);
  }
}

export function assertProductScanMatches(
  scan: string,
  product: { id: string; sku: string; barcode: string | null },
  variant?: { id: string; sku: string; barcode: string | null } | null
) {
  const productMatches = scan === product.id || scan === product.sku || scan === product.barcode;
  const variantMatches = variant ? scan === variant.id || scan === variant.sku || scan === variant.barcode : false;
  if (!productMatches && !variantMatches) {
    throw new AppError("Scanned product does not match the pick line.", 409);
  }
}

export function headerStatusForLineStatuses(statuses: string[]) {
  if (statuses.length > 0 && statuses.every((status) => status === "COMPLETED")) {
    return "COMPLETED";
  }
  if (statuses.some((status) => status === "COMPLETED" || status === "IN_PROGRESS")) {
    return "IN_PROGRESS";
  }
  return "OPEN";
}

export function pickExceptionReason(input: { pickedQuantity: number; requiredQuantity: number }) {
  return input.pickedQuantity > 0 && input.pickedQuantity < input.requiredQuantity ? "SHORT_PICK_REVIEW" : null;
}
