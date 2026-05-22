import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  assertCanApproveCount,
  assertCanRejectCount,
  assertCanSubmitCount,
  countDifference
} from "@/server/services/cycleCountRules";

describe("cycle count rules", () => {
  it("computes count difference from expected snapshot", () => {
    expect(countDifference(10, 7)).toBe(-3);
    expect(countDifference(10, 13)).toBe(3);
  });

  it("does not accept negative counted quantities", () => {
    expect(() => countDifference(10, -1)).toThrow(AppError);
  });

  it("requires all lines counted before submission", () => {
    expect(() => assertCanSubmitCount([{ countedQty: 1 }, { countedQty: 0 }])).not.toThrow();
    expect(() => assertCanSubmitCount([{ countedQty: 1 }, { countedQty: null }])).toThrow(AppError);
  });

  it("approval only works from pending approval and cannot run twice", () => {
    expect(() => assertCanApproveCount("PENDING_APPROVAL")).not.toThrow();
    expect(() => assertCanApproveCount("COUNTING")).toThrow(AppError);
    expect(() => assertCanApproveCount("APPROVED")).toThrow(AppError);
  });

  it("rejection only works from pending approval and never after approval", () => {
    expect(() => assertCanRejectCount("PENDING_APPROVAL")).not.toThrow();
    expect(() => assertCanRejectCount("COUNTING")).toThrow(AppError);
    expect(() => assertCanRejectCount("APPROVED")).toThrow(AppError);
  });
});
