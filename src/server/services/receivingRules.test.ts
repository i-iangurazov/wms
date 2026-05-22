import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  assertPutAwayDestination,
  assertQuantityWithinAvailable,
  assertReceivingLocation,
  assertReceivingSessionOpen
} from "@/server/services/receivingRules";

describe("receiving rules", () => {
  it("requires an active receivable RECEIVING location", () => {
    expect(() =>
      assertReceivingLocation({ status: "ACTIVE", type: "RECEIVING", isReceivable: true })
    ).not.toThrow();
    expect(() =>
      assertReceivingLocation({ status: "ACTIVE", type: "STORAGE", isReceivable: true })
    ).toThrow(AppError);
  });

  it("prevents receiving into completed sessions", () => {
    expect(() => assertReceivingSessionOpen("RECEIVING")).not.toThrow();
    expect(() => assertReceivingSessionOpen("COMPLETED")).toThrow(AppError);
  });

  it("allows put-away only to active storage or picking locations", () => {
    expect(() =>
      assertPutAwayDestination({ status: "ACTIVE", type: "STORAGE", isPickable: false })
    ).not.toThrow();
    expect(() =>
      assertPutAwayDestination({ status: "ACTIVE", type: "PICKING", isPickable: true })
    ).not.toThrow();
    expect(() =>
      assertPutAwayDestination({ status: "ACTIVE", type: "RECEIVING", isPickable: false })
    ).toThrow(AppError);
  });

  it("prevents put-away above available receiving stock", () => {
    expect(() => assertQuantityWithinAvailable(4, 5)).not.toThrow();
    expect(() => assertQuantityWithinAvailable(6, 5)).toThrow(AppError);
  });
});
