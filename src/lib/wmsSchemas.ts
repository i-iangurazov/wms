import { z } from "zod";

const optionalText = (max: number, maxMessage: string) =>
  z
    .string()
    .trim()
    .max(max, maxMessage)
    .optional()
    .nullable();

const id = z.string().trim().min(1, "Заполните обязательные поля.");
const positiveInt = z.coerce.number().int("Количество должно быть целым числом.").positive("Количество должно быть больше нуля.");
const nonNegativeInt = z.coerce
  .number()
  .int("Количество должно быть целым числом.")
  .min(0, "Количество не может быть отрицательным.");

export const roleSchema = z.enum(["OWNER", "ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE_WORKER", "VIEWER"], {
  message: "Некорректная роль пользователя."
});

export const warehouseStatusSchema = z.enum(["ACTIVE", "INACTIVE"], {
  message: "Некорректный статус."
});

export const locationTypeSchema = z.enum(["RECEIVING", "STORAGE", "PICKING", "PACKING", "SHIPPING", "RETURNS", "DAMAGED"], {
  message: "Некорректный тип ячейки."
});

export const productInputSchema = z.object({
  sku: z.string().trim().min(1, "Укажите SKU товара.").max(64, "SKU товара слишком длинный."),
  name: z.string().trim().min(1, "Укажите название товара.").max(160, "Название товара слишком длинное."),
  barcode: optionalText(128, "Штрихкод слишком длинный.")
});

export const productVariantInputSchema = productInputSchema.extend({
  productId: id
});

export const warehouseInputSchema = z.object({
  code: z.string().trim().min(1, "Укажите код склада.").max(32, "Код склада слишком длинный."),
  name: z.string().trim().min(1, "Укажите название склада.").max(120, "Название склада слишком длинное."),
  status: warehouseStatusSchema
});

export const locationInputSchema = z.object({
  warehouseId: id,
  zoneId: optionalText(128, "Зона указана некорректно."),
  code: z.string().trim().min(1, "Укажите код ячейки.").max(64, "Код ячейки слишком длинный."),
  barcode: optionalText(128, "Штрихкод слишком длинный."),
  type: locationTypeSchema,
  status: warehouseStatusSchema,
  isPickable: z.boolean(),
  isReceivable: z.boolean(),
  isSellable: z.boolean()
});

export const receivingSessionInputSchema = z.object({
  warehouseId: id,
  receivingLocationId: id,
  reference: optionalText(80, "Ссылка на поставку слишком длинная.")
});

export const receivingLineInputSchema = z.object({
  productId: id,
  variantId: optionalText(128, "Вариант указан некорректно."),
  expectedQty: nonNegativeInt
});

export const receivingReceiveInputSchema = z.object({
  lineId: id,
  quantity: positiveInt,
  damagedQuantity: nonNegativeInt,
  allowOverReceipt: z.boolean(),
  note: optionalText(500, "Примечание слишком длинное."),
  idempotencyKey: optionalText(128, "Ключ операции слишком длинный.")
});

export const transferInputSchema = z.object({
  productId: id,
  variantId: optionalText(128, "Вариант указан некорректно."),
  fromLocationId: id,
  toLocationId: id,
  quantity: positiveInt,
  idempotencyKey: optionalText(128, "Ключ операции слишком длинный.")
});

export const adjustmentInputSchema = z.object({
  productId: id,
  variantId: optionalText(128, "Вариант указан некорректно."),
  locationId: id,
  reason: z.enum(["DAMAGED", "LOST", "FOUND", "COUNT_CORRECTION", "MANUAL_CORRECTION", "EXPIRED", "RETURNED_TO_STOCK"], {
    message: "Некорректная причина корректировки."
  }),
  quantityDelta: z.coerce.number().int("Количество должно быть целым числом."),
  note: optionalText(500, "Примечание слишком длинное."),
  allowNegativeOnHand: z.boolean(),
  targetState: z.enum(["ON_HAND", "DAMAGED", "BLOCKED"], { message: "Некорректный тип остатка." }),
  idempotencyKey: optionalText(128, "Ключ операции слишком длинный.")
});

export const cycleCountCreateInputSchema = z.object({
  warehouseId: id,
  locationId: id
});

export const cycleCountLineInputSchema = z.object({
  lineId: id,
  countedQty: nonNegativeInt
});

export const pickingInputSchema = z.object({
  orderId: id,
  warehouseId: id.optional()
});

export const userInviteInputSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя пользователя.").max(120, "Имя пользователя слишком длинное."),
  email: z.string().trim().email("Укажите корректный email пользователя.").max(180, "Email пользователя слишком длинный."),
  role: roleSchema,
  initialPassword: z.string().min(10, "Пароль должен быть не короче 10 символов.")
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
export type WarehouseInput = z.infer<typeof warehouseInputSchema>;
