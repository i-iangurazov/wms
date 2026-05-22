import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import {
  assertPutAwayDestination,
  assertQuantityWithinAvailable,
  assertReceiveQuantities,
  assertReceivingLocation,
  assertReceivingSessionOpen,
  nextReceivingLineStatus,
  shortReceiptQuantity
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

  it("allows good and damaged receive quantities but rejects empty receives", () => {
    expect(() => assertReceiveQuantities({ goodQty: 0, damagedQty: 2 })).not.toThrow();
    expect(() => assertReceiveQuantities({ goodQty: 0, damagedQty: 0 })).toThrow(AppError);
    expect(() => assertReceiveQuantities({ goodQty: -1, damagedQty: 0 })).toThrow(AppError);
  });

  it("classifies exact and over-received lines", () => {
    expect(nextReceivingLineStatus({ expectedQty: 5, receivedQty: 3, damagedQty: 0 })).toBe("OPEN");
    expect(nextReceivingLineStatus({ expectedQty: 5, receivedQty: 4, damagedQty: 1 })).toBe("RECEIVED");
    expect(nextReceivingLineStatus({ expectedQty: 5, receivedQty: 6, damagedQty: 0 })).toBe("OVER_RECEIVED");
  });

  it("calculates short receipt quantity", () => {
    expect(shortReceiptQuantity({ expectedQty: 5, receivedQty: 3, damagedQty: 1 })).toBe(1);
    expect(shortReceiptQuantity({ expectedQty: 5, receivedQty: 6, damagedQty: 0 })).toBe(0);
  });
});
