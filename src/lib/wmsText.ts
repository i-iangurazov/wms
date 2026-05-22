import type { PermissionKey } from "@/lib/permissionModel";

export const wmsNavItems = [
  { href: "/wms", label: "Обзор", permission: "wms.view" },
  { href: "/wms/tasks", label: "Задачи", permission: "receiving.execute" },
  { href: "/wms/stock", label: "Товары и остатки", permission: "wms.view" },
  { href: "/wms/receiving", label: "Приёмка", permission: "receiving.execute" },
  { href: "/wms/fulfillment", label: "Сборка и упаковка", permission: "picking.execute" },
  { href: "/wms/cycle-counts", label: "Инвентаризация", permission: "cycleCounts.execute" },
  { href: "/wms/replenishment", label: "Пополнение", permission: "putaway.execute" },
  { href: "/wms/locations", label: "Склады", permission: "wms.manageLocations" },
  { href: "/wms/journal", label: "Журнал", permission: "audit.view" },
  { href: "/wms/settings", label: "Настройки", permission: "users.manage" }
] as const satisfies ReadonlyArray<{ href: string; label: string; permission: PermissionKey }>;

export const statusLabels: Record<string, string> = {
  ACTIVE: "Активно",
  INACTIVE: "Недоступно",
  OPEN: "Открыто",
  DRAFT: "Черновик",
  RECEIVING: "Приёмка",
  RECEIVED: "Принято",
  CLOSED_SHORT: "Недопоставка",
  OVER_RECEIVED: "Принято сверх",
  COUNTING: "Подсчёт",
  PENDING_APPROVAL: "Требует проверки",
  APPROVED: "Утверждено",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  ALLOCATED: "Зарезервировано",
  PICKING: "Сборка",
  PICKED: "Собрано",
  PACKING: "Упаковка",
  PACKED: "Упаковано",
  READY_TO_SHIP: "Передан в отгрузку",
  RESERVED: "Зарезервировано",
  RELEASED: "Резерв снят",
  SHORT: "Недостаточно товара",
  SHORT_PICK_REVIEW: "Требует проверки"
};

export const locationTypeLabels: Record<string, string> = {
  RECEIVING: "Приёмка",
  STORAGE: "Хранение",
  PICKING: "Сборка",
  PACKING: "Упаковка",
  SHIPPING: "Отгрузка",
  RETURNS: "Возвраты",
  DAMAGED: "Повреждено"
};

export const movementTypeLabels: Record<string, string> = {
  RECEIVE: "Приёмка",
  PUTAWAY: "Размещение",
  TRANSFER: "Перемещение",
  ADJUSTMENT: "Корректировка",
  CYCLE_COUNT_CORRECTION: "Инвентаризация",
  RESERVE: "Резервирование",
  RELEASE_RESERVATION: "Снятие резерва",
  PICK: "Сборка заказа"
};

export const adjustmentReasonLabels: Record<string, string> = {
  DAMAGED: "Повреждено",
  LOST: "Потеряно",
  FOUND: "Найдено",
  COUNT_CORRECTION: "Коррекция после подсчёта",
  MANUAL_CORRECTION: "Ручная коррекция",
  EXPIRED: "Истёк срок",
  RETURNED_TO_STOCK: "Возврат в остаток"
};

export const auditActionLabels: Record<string, string> = {
  "warehouse.create": "Создан склад",
  "warehouse.update": "Изменён склад",
  "warehouse_zone.create": "Создана зона",
  "warehouse_zone.update": "Изменена зона",
  "warehouse_work_template.create": "Создан шаблон задания",
  "warehouse_work_template.deactivate": "Отключён шаблон задания",
  "warehouse_location_directive.create": "Создано складское правило",
  "warehouse_location_directive.deactivate": "Отключено складское правило",
  "warehouse_location.create": "Создана ячейка",
  "warehouse_location.update": "Изменена ячейка",
  "product.create": "Создан товар",
  "product.import_csv": "Импортированы товары",
  "product.update": "Изменён товар",
  "product.deactivate": "Товар сделан недоступным",
  "product_variant.create": "Создан вариант товара",
  "product_variant.update": "Изменён вариант товара",
  "product_variant.deactivate": "Вариант сделан недоступным",
  "customer_order.create": "Создан заказ",
  "inventory_reservation.create": "Создан резерв",
  "inventory_reservation.release": "Снят резерв",
  "receiving_session.create": "Создана приёмка",
  "receiving_line.create": "Добавлен товар в приёмку",
  "receiving_line.receive": "Товар принят",
  "receiving_session.complete": "Приёмка завершена",
  "inventory_movement.create": "Создано движение товара",
  "cycle_count.create": "Создана инвентаризация",
  "cycle_count.line_counted": "Внесён результат подсчёта",
  "cycle_count.submit": "Инвентаризация отправлена на проверку",
  "cycle_count.approve": "Инвентаризация утверждена",
  "cycle_count.reject": "Инвентаризация возвращена на пересчёт",
  "warehouse_work.create_pick": "Создано задание на сборку",
  "warehouse_work.create_putaway": "Создано задание на размещение",
  "warehouse_work.create_replenishment": "Создано задание на пополнение",
  "warehouse_work.create_pack": "Создано задание на упаковку",
  "warehouse_work.line_pick": "Выполнен шаг сборки",
  "warehouse_work_line.pick": "Выполнен шаг сборки",
  "warehouse_work_line.putaway": "Выполнен шаг размещения",
  "warehouse_work_line.replenish": "Выполнен шаг пополнения",
  "warehouse_work_line.pack": "Выполнен шаг упаковки",
  "customer_order.ready_to_ship": "Заказ передан в отгрузку",
  "replenishment_rule.create": "Создано правило пополнения",
  "replenishment_rule.deactivate": "Отключено правило пополнения",
  "barcode_label.create": "Создан штрихкод",
  "store_user.create": "Добавлен пользователь",
  "store_user.update_role": "Изменена роль пользователя",
  "store_user.remove": "Удалён доступ пользователя",
  "organization.create": "Создана организация"
};

export const auditEntityLabels: Record<string, string> = {
  Warehouse: "Склад",
  WarehouseZone: "Зона",
  WarehouseWorkTemplate: "Шаблон задания",
  WarehouseLocationDirective: "Складское правило",
  WarehouseLocation: "Ячейка",
  Product: "Товар",
  ProductVariant: "Вариант товара",
  CustomerOrder: "Заказ",
  ReceivingSession: "Приёмка",
  ReceivingLine: "Строка приёмки",
  InventoryMovement: "Движение товара",
  CycleCountSession: "Инвентаризация",
  CycleCountLine: "Строка инвентаризации",
  WarehouseWork: "Складское задание",
  WarehouseWorkLine: "Шаг задания",
  ReplenishmentRule: "Правило пополнения",
  BarcodeLabel: "Штрихкод",
  StoreUser: "Доступ пользователя",
  Store: "Организация"
};

export const commonText = {
  appName: "WMS",
  appSubtitle: "Складские операции",
  storeScope: "Работа в рамках выбранной организации",
  loading: "Загрузка...",
  actions: "Действия",
  create: "Создать",
  save: "Сохранить",
  update: "Обновить",
  cancel: "Отменить",
  edit: "Изменить",
  deactivate: "Сделать недоступным",
  complete: "Завершить",
  confirm: "Подтвердить",
  scan: "Сканировать",
  code: "Код",
  name: "Название",
  status: "Статус",
  warehouse: "Склад",
  location: "Ячейка",
  product: "Товар",
  quantity: "Количество",
  barcode: "Штрихкод",
  type: "Тип",
  note: "Примечание",
  reference: "Номер/основание",
  none: "Нет",
  baseProduct: "Основной товар"
};

export const emptyStates = {
  warehousesTitle: "Пока нет складов",
  warehousesBody: "Создайте первый склад, чтобы добавить ячейки и начать работу.",
  locationsTitle: "Пока нет ячеек",
  locationsBody: "Добавьте ячейки для приёмки, хранения и сборки заказов.",
  productsTitle: "Пока нет товаров",
  productsBody: "Добавьте товары и штрихкоды, чтобы принимать и собирать заказы.",
  balancesTitle: "Остатков пока нет",
  balancesBody: "Остатки появятся после приёмки, размещения или перемещения товара.",
  movementsTitle: "Движений пока нет",
  movementsBody: "Все изменения остатков будут отображаться здесь.",
  auditTitle: "Журнал пока пуст",
  auditBody: "Создание складов, товаров, приёмка и корректировки будут отображаться здесь.",
  receivingTitle: "Пока нет приёмок",
  receivingBody: "Создайте приёмку, чтобы принять товар на склад.",
  putawayTitle: "Нет товаров для размещения",
  putawayBody: "Сначала выполните приёмку товара.",
  pickingTitle: "Нет заданий для сборки",
  pickingBody: "Новые заказы появятся здесь, когда для них будет создано задание.",
  countsTitle: "Пока нет инвентаризаций",
  countsBody: "Создайте пересчёт по складу или ячейке.",
  dashboardTitle: "Нет данных",
  dashboardBody: "После складских операций здесь появятся показатели и задания."
};

export const scannerText = {
  location: "Отсканируйте ячейку",
  sourceLocation: "Отсканируйте исходную ячейку",
  destinationLocation: "Отсканируйте ячейку назначения",
  product: "Отсканируйте товар",
  quantity: "Укажите количество",
  checkBeforeConfirm: "Проверьте количество перед подтверждением"
};

export function labelFor(map: Record<string, string>, value: string | null | undefined) {
  if (!value) {
    return commonText.none;
  }
  return map[value] ?? value;
}
