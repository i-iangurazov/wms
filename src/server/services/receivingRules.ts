import type { LocationType, ReceivingStatus, WarehouseStatus } from "@prisma/client";
import { AppError } from "@/server/errors";

export function assertReceivingLocation(input: {
  status: WarehouseStatus;
  type: LocationType;
  isReceivable: boolean;
}) {
  if (input.status !== "ACTIVE" || input.type !== "RECEIVING" || !input.isReceivable) {
    throw new AppError("Receiving requires an active RECEIVING location.", 409);
  }
}

export function assertReceivingSessionOpen(status: ReceivingStatus) {
  if (status === "COMPLETED") {
    throw new AppError("Receiving session is already completed.", 409);
  }
  if (status === "CANCELLED") {
    throw new AppError("Receiving session is cancelled.", 409);
  }
}

export function assertPutAwayDestination(input: {
  status: WarehouseStatus;
  type: LocationType;
  isPickable: boolean;
}) {
  const allowedType = input.type === "STORAGE" || input.type === "PICKING";
  if (input.status !== "ACTIVE" || !allowedType) {
    throw new AppError("Put-away destination must be an active STORAGE or PICKING location.", 409);
  }
}

export function assertQuantityWithinAvailable(quantity: number, available: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError("Quantity must be a positive whole number.", 400);
  }
  if (quantity > available) {
    throw new AppError("Quantity exceeds available stock.", 409);
  }
}
