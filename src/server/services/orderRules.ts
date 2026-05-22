import { AppError } from "@/server/errors";

export function normalizeOrderNumber(value: string) {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

export function assertOrderNumber(value: string) {
  const number = normalizeOrderNumber(value);
  if (!number) {
    throw new AppError("Order number is required.", 400);
  }
  if (number.length > 80) {
    throw new AppError("Order number is too long.", 400);
  }
  return number;
}

export function assertOrderQuantity(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError("Order quantity must be a positive whole number.", 400);
  }
  return value;
}
