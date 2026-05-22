import { NextResponse } from "next/server";
import { AppError } from "@/server/errors";

const russianErrorMessages: Record<string, string> = {
  "Invalid user or store context.": "Не удалось определить пользователя или организацию.",
  "No active user/store context found. Run the seed script first.":
    "Не найден активный пользователь и организация. Сначала выполните начальную настройку.",
  "Request context is required.": "Войдите в систему.",
  "Invalid email or password.": "Неверный email или пароль.",
  "User does not have access to an active organization.": "У пользователя нет доступа к активной организации.",
  "Password must be at least 10 characters.": "Пароль должен быть не короче 10 символов.",
  "Initial password is required for a new user.": "Для нового пользователя укажите временный пароль.",
  "You do not have permission to perform this action.": "Недостаточно прав для этого действия.",
  "Cross-store access is not allowed.": "Нет доступа к данным другой организации.",
  "User does not have access to this store.": "У пользователя нет доступа к этой организации.",
  "Invalid user role.": "Некорректная роль пользователя.",
  "User email is required.": "Укажите email пользователя.",
  "User email is too long.": "Email пользователя слишком длинный.",
  "User email is invalid.": "Укажите корректный email пользователя.",
  "User name is required.": "Укажите имя пользователя.",
  "User name is too long.": "Имя пользователя слишком длинное.",
  "User already has access to this organization.": "У пользователя уже есть доступ к этой организации.",
  "User membership not found.": "Доступ пользователя не найден.",
  "Cannot remove the last organization admin.": "Нельзя удалить или понизить последнего администратора организации.",
  "Organization code is required.": "Укажите код организации.",
  "Organization code is too long.": "Код организации слишком длинный.",
  "Organization name is required.": "Укажите название организации.",
  "Organization name is too long.": "Название организации слишком длинное.",
  "Organization code already exists.": "Организация с таким кодом уже есть.",
  "Expected a JSON object body.": "Некорректный запрос.",
  "Invalid warehouse status.": "Некорректный статус склада.",
  "Invalid location type.": "Некорректный тип ячейки.",
  "Invalid work template type.": "Некорректный тип складского шаблона.",
  "Invalid location directive type.": "Некорректный тип складского правила.",
  "Invalid warehouse rule kind.": "Некорректный тип правила склада.",
  "Warehouse rule id is required.": "Укажите правило склада.",
  "Rule name is required.": "Укажите название правила.",
  "Rule name is too long.": "Название правила слишком длинное.",
  "Rule priority must be a whole number from 0 to 9999.": "Приоритет правила должен быть целым числом от 0 до 9999.",
  "Location directive requires a zone.": "Для этого правила выберите зону.",
  "Location directive requires a location.": "Для этого правила выберите ячейку.",
  "Default receiving directive requires a receivable location.": "Правило приёмки требует ячейку, куда можно принимать товар.",
  "Pick directive requires a pickable location.": "Правило сборки требует ячейку, из которой можно собирать товар.",
  "Damaged directive requires a damaged location.": "Правило повреждений требует ячейку типа «Повреждено».",
  "Work template not found.": "Шаблон задания не найден.",
  "Location directive not found.": "Складское правило не найдено.",
  "Default receiving location is not configured.": "Настройте ячейку приёмки для этого склада.",
  "Invalid replenishment action.": "Некорректное действие пополнения.",
  "Replenishment rule id is required.": "Укажите правило пополнения.",
  "Replenishment minimum must be zero or greater.": "Минимум пополнения не может быть отрицательным.",
  "Replenishment maximum must be greater than minimum.": "Максимум пополнения должен быть больше минимума.",
  "Replenishment source is required.": "Выберите источник пополнения.",
  "Pick location not found.": "Ячейка сборки не найдена.",
  "Source location not found.": "Ячейка-источник не найдена.",
  "Replenishment source and pick location must be different.": "Источник и ячейка сборки должны отличаться.",
  "Replenishment rule not found.": "Правило пополнения не найдено.",
  "Open replenishment work already exists.": "Открытое задание на пополнение уже создано.",
  "Replenishment is not needed.": "Пополнение пока не требуется.",
  "No stock available for replenishment.": "Нет доступного товара для пополнения.",
  "Replenishment line not found.": "Шаг пополнения не найден.",
  "Replenishment destination not found.": "Ячейка назначения для пополнения не найдена.",
  "Replenishment line is already completed.": "Этот шаг пополнения уже завершён.",
  "Replenishment quantity must be a positive whole number.": "Количество для пополнения должно быть положительным целым числом.",
  "Replenishment quantity exceeds remaining work quantity.": "Нельзя пополнить больше, чем осталось в задании.",
  "Invalid packing action.": "Некорректное действие упаковки.",
  "Order must be picked before packing.": "Сначала завершите сборку заказа.",
  "Pack work already exists for this order.": "Задание на упаковку для этого заказа уже создано.",
  "Completed pick work is required before packing.": "Для упаковки нужно завершённое задание на сборку.",
  "Picked order line not found for packing.": "Не найдена собранная строка заказа для упаковки.",
  "Pack line not found.": "Шаг упаковки не найден.",
  "Pack line is already completed.": "Этот шаг упаковки уже завершён.",
  "Pack quantity must be a positive whole number.": "Количество для упаковки должно быть положительным целым числом.",
  "Pack quantity exceeds remaining work quantity.": "Нельзя упаковать больше, чем осталось в задании.",
  "Order must be packed before shipping handoff.": "Сначала упакуйте заказ.",
  "Invalid adjustment reason.": "Некорректная причина корректировки.",
  "Invalid adjustment target state.": "Некорректный тип корректировки остатка.",
  "Barcode scan is required.": "Отсканируйте код.",
  "Barcode was not found.": "Скан не найден.",
  "Barcode matches multiple records.": "Скан найден в нескольких местах. Уточните действие.",
  "Invalid barcode type.": "Некорректный тип скана.",
  "Invalid barcode label type.": "Некорректный тип штрихкода.",
  "Barcode label code is required.": "Укажите код штрихкода.",
  "Barcode label code is too long.": "Код штрихкода слишком длинный.",
  "Barcode target is required.": "Выберите объект для штрихкода.",
  "Barcode label already exists.": "Такой штрихкод уже зарегистрирован.",
  "Barcode label conflicts with an existing record.": "Этот код уже используется другим товаром, ячейкой или заданием.",
  "Warehouse not found.": "Склад не найден.",
  "Warehouse zone not found.": "Зона не найдена.",
  "Location not found.": "Ячейка не найдена.",
  "Product not found.": "Товар не найден.",
  "Product variant not found.": "Вариант товара не найден.",
  "Product SKU is required.": "Укажите SKU товара.",
  "Product SKU is too long.": "SKU товара слишком длинный.",
  "Product name is required.": "Укажите название товара.",
  "Product name is too long.": "Название товара слишком длинное.",
  "Product SKU already exists.": "Товар или вариант с таким SKU уже есть.",
  "Product barcode already exists.": "Товар или вариант с таким штрихкодом уже есть.",
  "Cannot deactivate product with stock or open work.":
    "Нельзя сделать товар недоступным, пока по нему есть остатки или открытые задания.",
  "Cannot deactivate product variant with stock or open work.":
    "Нельзя сделать вариант недоступным, пока по нему есть остатки или открытые задания.",
  "Active warehouse not found.": "Активный склад не найден.",
  "Cannot deactivate warehouse with active locations.":
    "Нельзя сделать склад недоступным, пока в нём есть активные ячейки.",
  "Cannot deactivate warehouse with stock or open work.":
    "Нельзя сделать склад недоступным, пока по нему есть остатки или открытые задания.",
  "Cannot deactivate zone with active locations.": "Нельзя сделать зону недоступной, пока в ней есть активные ячейки.",
  "Cannot deactivate location with stock or open work.":
    "Нельзя сделать ячейку недоступной, пока в ней есть остатки или открытые задания.",
  "Active count location not found.": "Активная ячейка для пересчёта не найдена.",
  "Receiving location not found.": "Ячейка приёмки не найдена.",
  "Receiving session not found.": "Приёмка не найдена.",
  "Receiving line not found.": "Строка приёмки не найдена.",
  "Receiving requires an active RECEIVING location.": "Для приёмки нужна активная ячейка приёмки.",
  "Receiving session is already completed.": "Приёмка уже завершена.",
  "Receiving session is cancelled.": "Приёмка отменена.",
  "Receiving session is already completed": "Приёмка уже завершена.",
  "Expected quantity must be zero or greater.": "Ожидаемое количество не может быть отрицательным.",
  "Received quantity must be positive.": "Количество для приёмки должно быть больше нуля.",
  "Received quantity exceeds expected quantity.": "Принятое количество больше ожидаемого.",
  "Cannot complete a receiving session with no lines.": "Нельзя завершить приёмку без товаров.",
  "All receiving lines must be received before completion.": "Сначала примите все товары в приёмке.",
  "Source receiving location not found.": "Исходная ячейка приёмки не найдена.",
  "Destination location not found.": "Ячейка назначения не найдена.",
  "Put-away destination must be an active STORAGE or PICKING location.":
    "Размещать товар можно только в активную ячейку хранения или сборки.",
  "Quantity must be a positive whole number.": "Количество должно быть положительным целым числом.",
  "Quantity exceeds available stock.": "Количество больше доступного остатка.",
  "Insufficient stock at source location.": "Недостаточно товара в выбранной ячейке.",
  "Movement requires a source or destination location.": "Укажите исходную ячейку или ячейку назначения.",
  "Source and destination locations must be different.": "Исходная ячейка и ячейка назначения должны отличаться.",
  "Stock state adjustment cannot also move stock.": "Корректировка состояния не может одновременно перемещать товар.",
  "Stock state adjustment requires a target location and delta.": "Для корректировки состояния укажите ячейку и количество.",
  "Idempotency key is too long.": "Ключ повторной отправки слишком длинный.",
  "Idempotency key was already used for a different stock command.":
    "Эта операция уже была отправлена с другими данными. Обновите экран и повторите действие.",
  "Stock command is already being processed.": "Операция уже выполняется. Подождите несколько секунд.",
  "Manual correction requires a note.": "Для ручной коррекции нужно примечание.",
  "Adjustment quantity delta must be a non-zero whole number.":
    "Количество корректировки должно быть ненулевым целым числом.",
  "Counted quantity must be zero or greater.": "Посчитанное количество не может быть отрицательным.",
  "Cycle count has no lines to submit.": "В инвентаризации нет строк для отправки.",
  "All cycle count lines must be counted before submission.": "Сначала заполните все строки инвентаризации.",
  "Cycle count is already approved.": "Инвентаризация уже утверждена.",
  "Approved cycle count cannot be rejected.": "Утверждённую инвентаризацию нельзя вернуть на пересчёт.",
  "Cycle count must be pending approval.": "Инвентаризация должна ожидать утверждения.",
  "Cycle count line not found.": "Строка инвентаризации не найдена.",
  "Cycle count is not open for counting.": "Инвентаризация не открыта для подсчёта.",
  "Cycle count not found.": "Инвентаризация не найдена.",
  "Cycle count is not open for submission.": "Инвентаризацию сейчас нельзя отправить на проверку.",
  "Picked quantity must be a positive whole number.": "Количество для сборки должно быть положительным целым числом.",
  "Picked quantity exceeds remaining work quantity.": "Нельзя собрать больше, чем осталось в задании.",
  "Scanned location does not match the pick line source.": "Отсканирована другая ячейка.",
  "Scanned product does not match the pick line.": "Отсканирован другой товар.",
  "Order not found.": "Заказ не найден.",
  "Order number is required.": "Укажите номер заказа.",
  "Order number is too long.": "Номер заказа слишком длинный.",
  "Order quantity must be a positive whole number.": "Количество в заказе должно быть положительным целым числом.",
  "Order number already exists.": "Заказ с таким номером уже есть.",
  "Pick work already exists for this order.": "Задание на сборку для этого заказа уже создано.",
  "No pickable stock location can satisfy an order line.": "Нет подходящей ячейки сборки с нужным товаром.",
  "Pick line not found.": "Шаг сборки не найден.",
  "Pick line is already completed.": "Этот шаг сборки уже завершён.",
  "Warehouse work not found.": "Складское задание не найдено."
};

function publicErrorMessage(message: string) {
  if (russianErrorMessages[message]) {
    return russianErrorMessages[message];
  }
  if (message.endsWith(" is required.")) {
    return "Заполните обязательные поля.";
  }
  if (message.endsWith(" location not found.")) {
    return "Ячейка не найдена.";
  }
  if (message.endsWith(" location is inactive.")) {
    return "Выбранная ячейка недоступна.";
  }
  if (message.endsWith(" belongs to another store.")) {
    return "Нет доступа к данным другой организации.";
  }
  return message;
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonCreated<T>(data: T) {
  return jsonOk(data, 201);
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: publicErrorMessage(error.message) }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Внутренняя ошибка сервера." }, { status: 500 });
}

export async function parseJsonObject(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("Некорректный запрос.", 400);
  }
  return body as Record<string, unknown>;
}

export function readString(body: Record<string, unknown>, key: string): string;
export function readString(body: Record<string, unknown>, key: string, required: false): string | undefined;
export function readString(body: Record<string, unknown>, key: string, required = true) {
  const value = body[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (required) {
    throw new AppError("Заполните обязательные поля.", 400);
  }
  return undefined;
}

export function readBoolean(body: Record<string, unknown>, key: string, fallback = false) {
  const value = body[key];
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export function readNumber(body: Record<string, unknown>, key: string, fallback?: number) {
  const value = body[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new AppError("Заполните обязательные поля.", 400);
}
