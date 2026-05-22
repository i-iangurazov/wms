import type { CycleCountStatus } from "@prisma/client";
import { AppError } from "@/server/errors";

export function countDifference(expectedQty: number, countedQty: number) {
  if (!Number.isInteger(countedQty) || countedQty < 0) {
    throw new AppError("Counted quantity must be zero or greater.", 400);
  }
  return countedQty - expectedQty;
}

export function assertCanSubmitCount(lines: { countedQty: number | null }[]) {
  if (lines.length === 0) {
    throw new AppError("Cycle count has no lines to submit.", 409);
  }
  if (lines.some((line) => line.countedQty === null)) {
    throw new AppError("All cycle count lines must be counted before submission.", 409);
  }
}

export function assertCanApproveCount(status: CycleCountStatus) {
  if (status === "APPROVED") {
    throw new AppError("Cycle count is already approved.", 409);
  }
  if (status !== "PENDING_APPROVAL") {
    throw new AppError("Cycle count must be pending approval.", 409);
  }
}

export function assertCanRejectCount(status: CycleCountStatus) {
  if (status === "APPROVED") {
    throw new AppError("Approved cycle count cannot be rejected.", 409);
  }
  if (status !== "PENDING_APPROVAL") {
    throw new AppError("Cycle count must be pending approval.", 409);
  }
}
