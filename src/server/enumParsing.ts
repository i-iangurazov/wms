import { AdjustmentReason, LocationType, WarehouseStatus } from "@prisma/client";
import { AppError } from "@/server/errors";

export function parseWarehouseStatus(value: unknown, fallback?: WarehouseStatus): WarehouseStatus | undefined {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "string" && Object.values(WarehouseStatus).includes(value as WarehouseStatus)) {
    return value as WarehouseStatus;
  }
  throw new AppError("Invalid warehouse status.", 400);
}

export function parseLocationType(value: unknown): LocationType {
  if (typeof value === "string" && Object.values(LocationType).includes(value as LocationType)) {
    return value as LocationType;
  }
  throw new AppError("Invalid location type.", 400);
}

export function parseAdjustmentReason(value: unknown): AdjustmentReason {
  if (typeof value === "string" && Object.values(AdjustmentReason).includes(value as AdjustmentReason)) {
    return value as AdjustmentReason;
  }
  throw new AppError("Invalid adjustment reason.", 400);
}
