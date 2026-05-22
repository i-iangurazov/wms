import { describe, expect, it } from "vitest";
import { AppError } from "@/server/errors";
import { assertOrderNumber, assertOrderQuantity, normalizeOrderNumber } from "@/server/services/orderRules";

describe("order rules", () => {
  it("normalizes order numbers", () => {
    expect(normalizeOrderNumber(" order 1001 ")).toBe("ORDER-1001");
  });

  it("requires valid order number and quantity", () => {
    expect(() => assertOrderNumber("")).toThrow(AppError);
    expect(() => assertOrderQuantity(0)).toThrow(AppError);
    expect(assertOrderNumber("a-1")).toBe("A-1");
    expect(assertOrderQuantity(2)).toBe(2);
  });
});
