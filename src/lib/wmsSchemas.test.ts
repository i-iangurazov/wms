import { describe, expect, it } from "vitest";
import {
  adjustmentInputSchema,
  productInputSchema,
  transferInputSchema,
  userInviteInputSchema,
  warehouseInputSchema
} from "@/lib/wmsSchemas";

describe("WMS shared schemas", () => {
  it("validates product payloads used by UI and API", () => {
    expect(productInputSchema.parse({ sku: " sku-1 ", name: " Товар ", barcode: "" })).toEqual({
      sku: "sku-1",
      name: "Товар",
      barcode: ""
    });
    expect(() => productInputSchema.parse({ sku: "", name: "Товар" })).toThrow("Укажите SKU товара.");
  });

  it("validates warehouse payloads with explicit status", () => {
    expect(warehouseInputSchema.parse({ code: "WH-1", name: "Основной", status: "ACTIVE" })).toEqual({
      code: "WH-1",
      name: "Основной",
      status: "ACTIVE"
    });
    expect(() => warehouseInputSchema.parse({ code: "WH-1", name: "Основной", status: "BAD" })).toThrow(
      "Некорректный статус."
    );
  });

  it("rejects unsafe operational payloads before service execution", () => {
    expect(() =>
      transferInputSchema.parse({
        productId: "product",
        fromLocationId: "from",
        toLocationId: "to",
        quantity: 0
      })
    ).toThrow("Количество должно быть больше нуля.");

    expect(() =>
      adjustmentInputSchema.parse({
        productId: "product",
        locationId: "location",
        reason: "UNKNOWN",
        quantityDelta: 1,
        allowNegativeOnHand: false,
        targetState: "ON_HAND"
      })
    ).toThrow("Некорректная причина корректировки.");
  });

  it("validates user invitation fields", () => {
    expect(() =>
      userInviteInputSchema.parse({
        name: "Сотрудник",
        email: "bad-email",
        role: "WAREHOUSE_WORKER",
        initialPassword: "ChangeMe123!"
      })
    ).toThrow("Укажите корректный email пользователя.");
  });
});
