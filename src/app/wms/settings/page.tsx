"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, dangerButtonClass, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { ActionMenu, DataTable, Select } from "@/components/ui";

type SettingsOverview = {
  organization: {
    id: string;
    name: string;
    code: string;
    active: boolean;
  };
  currentUser: {
    name: string;
    email: string;
    role: string;
  };
  counts: {
    users: number;
    products: number;
    warehouses: number;
    locations: number;
    openWork: number;
  };
  permissions: string[];
  auth: {
    devFallbackAllowed: boolean;
  };
};

type StoreUserRow = {
  id: string;
  role: string;
  user: {
    name: string;
    email: string;
    active: boolean;
  };
};

type OrganizationMembership = {
  id: string;
  role: string;
  store: {
    id: string;
    name: string;
    code: string;
    active: boolean;
  };
};

type RuleWarehouse = {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
};

type RuleZone = {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
};

type RuleLocation = {
  id: string;
  warehouseId: string;
  code: string;
  type: string;
  status: "ACTIVE" | "INACTIVE";
  isPickable: boolean;
  isReceivable: boolean;
};

type WorkTemplate = {
  id: string;
  warehouseId: string;
  type: string;
  name: string;
  priority: number;
  active: boolean;
  warehouse: RuleWarehouse;
};

type LocationDirective = {
  id: string;
  warehouseId: string;
  type: string;
  name: string;
  priority: number;
  active: boolean;
  zone: RuleZone | null;
  location: RuleLocation | null;
  warehouse: RuleWarehouse;
};

type WarehouseRules = {
  warehouses: RuleWarehouse[];
  zones: RuleZone[];
  locations: RuleLocation[];
  workTemplates: WorkTemplate[];
  locationDirectives: LocationDirective[];
};

const permissionLabels: Record<string, [string, string]> = {
  "org.manage": ["Управление организацией", "владение и критичные действия организации"],
  "users.manage": ["Управление пользователями", "добавление пользователей и изменение ролей"],
  "wms.view": ["Просмотр WMS", "обзор, остатки и история движений"],
  "wms.manageWarehouses": ["Управление складами", "создание и изменение складов"],
  "wms.manageLocations": ["Управление ячейками", "зоны, ячейки и складские правила"],
  "products.manage": ["Управление товарами", "создание товаров, вариантов и импорт"],
  "barcodes.manage": ["Управление штрихкодами", "товарные и складские штрихкоды"],
  "receiving.execute": ["Приёмка", "создание приёмок и принятие товара"],
  "putaway.execute": ["Размещение", "размещение товара и пополнение"],
  "transfers.execute": ["Перемещения", "внутренние перемещения между ячейками"],
  "adjustments.create": ["Корректировки", "изменение остатков с причиной"],
  "cycleCounts.execute": ["Инвентаризация", "создание и заполнение пересчётов"],
  "cycleCounts.approve": ["Утверждение инвентаризации", "применение расхождений к остаткам"],
  "picking.create": ["Создание сборки", "создание заданий сборки из заказов"],
  "picking.execute": ["Сборка заказов", "выполнение заданий сборки"],
  "packing.execute": ["Упаковка", "проверка и упаковка собранных заказов"],
  "reports.view": ["Отчёты", "проверка остатков и операционные показатели"],
  "audit.view": ["Журнал действий", "просмотр действий пользователей"]
};

const roleLabels: Record<string, string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  WAREHOUSE_MANAGER: "Руководитель склада",
  WAREHOUSE_WORKER: "Сотрудник склада",
  VIEWER: "Наблюдатель",
  MANAGER: "Менеджер (старый режим)",
  STAFF: "Сотрудник склада (старый режим)",
  CASHIER: "Кассир (старый режим)"
};

const roleOptions = [
  ["OWNER", roleLabels.OWNER],
  ["ADMIN", roleLabels.ADMIN],
  ["WAREHOUSE_MANAGER", roleLabels.WAREHOUSE_MANAGER],
  ["WAREHOUSE_WORKER", roleLabels.WAREHOUSE_WORKER],
  ["VIEWER", roleLabels.VIEWER]
] as const;

const workTemplateLabels: Record<string, string> = {
  RECEIVE: "Приёмка",
  PUTAWAY: "Размещение",
  TRANSFER: "Перемещение",
  REPLENISHMENT: "Пополнение",
  PICK: "Сборка",
  PACK: "Упаковка"
};

const directiveLabels: Record<string, string> = {
  DEFAULT_RECEIVING_LOCATION: "Ячейка приёмки по умолчанию",
  PREFERRED_PUTAWAY_ZONE: "Предпочтительная зона размещения",
  PICKABLE_LOCATION: "Приоритетная ячейка сборки",
  DAMAGED_LOCATION: "Ячейка для повреждений",
  REPLENISHMENT_SOURCE_ZONE: "Зона-источник пополнения",
  REPLENISHMENT_DESTINATION_ZONE: "Зона назначения пополнения"
};

const zoneDirectiveTypes = new Set([
  "PREFERRED_PUTAWAY_ZONE",
  "REPLENISHMENT_SOURCE_ZONE",
  "REPLENISHMENT_DESTINATION_ZONE"
]);

const countLabels: Record<keyof SettingsOverview["counts"], string> = {
  users: "Пользователи",
  products: "Товары",
  warehouses: "Склады",
  locations: "Ячейки",
  openWork: "Открытые задания"
};

export default function SettingsPage() {
  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [users, setUsers] = useState<StoreUserRow[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [rules, setRules] = useState<WarehouseRules | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "WAREHOUSE_WORKER",
    initialPassword: ""
  });
  const [organizationForm, setOrganizationForm] = useState({ name: "", code: "" });
  const [templateForm, setTemplateForm] = useState({ warehouseId: "", type: "PICK", name: "", priority: "100" });
  const [directiveForm, setDirectiveForm] = useState({
    warehouseId: "",
    type: "DEFAULT_RECEIVING_LOCATION",
    name: "",
    priority: "100",
    zoneId: "",
    locationId: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [organizationMessage, setOrganizationMessage] = useState<string | null>(null);
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const response = await fetch("/api/settings/overview", { cache: "no-store" });
      const payload = (await response.json()) as { overview?: SettingsOverview; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить настройки.");
        return;
      }
      const nextOverview = payload.overview ?? null;
      setOverview(nextOverview);
      await loadOrganizations();
      if (nextOverview?.permissions.includes("wms.manageLocations")) {
        await loadRules();
      }
      if (nextOverview?.permissions.includes("users.manage")) {
        await loadUsers();
      }
    }

    void loadSettings();
  }, []);

  async function loadUsers() {
    const response = await fetch("/api/users", { cache: "no-store" });
    const payload = (await response.json()) as { users?: StoreUserRow[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить пользователей.");
      return;
    }
    setUsers(payload.users ?? []);
  }

  async function loadOrganizations() {
    const response = await fetch("/api/organizations", { cache: "no-store" });
    const payload = (await response.json()) as { organizations?: OrganizationMembership[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить организации.");
      return;
    }
    setOrganizations(payload.organizations ?? []);
  }

  async function loadRules() {
    const response = await fetch("/api/warehouse-rules", { cache: "no-store" });
    const payload = (await response.json()) as Partial<WarehouseRules> & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить складские правила.");
      return;
    }
    const nextRules = {
      warehouses: payload.warehouses ?? [],
      zones: payload.zones ?? [],
      locations: payload.locations ?? [],
      workTemplates: payload.workTemplates ?? [],
      locationDirectives: payload.locationDirectives ?? []
    };
    setRules(nextRules);
    const firstWarehouseId = nextRules.warehouses.find((warehouse) => warehouse.status === "ACTIVE")?.id ?? "";
    setTemplateForm((current) => ({ ...current, warehouseId: current.warehouseId || firstWarehouseId }));
    setDirectiveForm((current) => ({ ...current, warehouseId: current.warehouseId || firstWarehouseId }));
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRuleMessage(null);
    const response = await fetch("/api/warehouse-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...templateForm, kind: "WORK_TEMPLATE" })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setRuleMessage(payload.error ?? "Не удалось создать шаблон.");
      return;
    }
    setTemplateForm((current) => ({ ...current, name: "", priority: "100" }));
    setRuleMessage("Шаблон задания создан.");
    await loadRules();
  }

  async function createDirective(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRuleMessage(null);
    const usesZone = zoneDirectiveTypes.has(directiveForm.type);
    const response = await fetch("/api/warehouse-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...directiveForm,
        kind: "LOCATION_DIRECTIVE",
        zoneId: usesZone ? directiveForm.zoneId : undefined,
        locationId: usesZone ? undefined : directiveForm.locationId
      })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setRuleMessage(payload.error ?? "Не удалось создать правило.");
      return;
    }
    setDirectiveForm((current) => ({ ...current, name: "", priority: "100", zoneId: "", locationId: "" }));
    setRuleMessage("Правило склада создано.");
    await loadRules();
  }

  async function deactivateRule(kind: "WORK_TEMPLATE" | "LOCATION_DIRECTIVE", id: string) {
    setRuleMessage(null);
    const response = await fetch(`/api/warehouse-rules?kind=${kind}&id=${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setRuleMessage(payload.error ?? "Не удалось отключить правило.");
      return;
    }
    setRuleMessage("Правило отключено.");
    await loadRules();
  }

  async function addOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrganizationMessage(null);
    const response = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(organizationForm)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setOrganizationMessage(payload.error ?? "Не удалось создать организацию.");
      return;
    }
    setOrganizationForm({ name: "", code: "" });
    setOrganizationMessage("Организация создана. Теперь её можно выбрать для работы.");
    await loadOrganizations();
  }

  async function switchOrganization(storeId: string) {
    setOrganizationMessage(null);
    const response = await fetch("/api/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setOrganizationMessage(payload.error ?? "Не удалось выбрать организацию.");
      return;
    }
    window.location.reload();
  }

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserMessage(null);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setUserMessage(payload.error ?? "Не удалось добавить пользователя.");
      return;
    }
    setUserForm({ name: "", email: "", role: "WAREHOUSE_WORKER", initialPassword: "" });
    setUserMessage("Пользователь добавлен.");
    await loadUsers();
  }

  async function updateRole(id: string, role: string) {
    setUserMessage(null);
    const response = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setUserMessage(payload.error ?? "Не удалось изменить роль.");
      return;
    }
    setUserMessage("Роль обновлена.");
    await loadUsers();
  }

  async function removeUser(id: string) {
    setUserMessage(null);
    const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setUserMessage(payload.error ?? "Не удалось удалить доступ.");
      return;
    }
    setUserMessage("Доступ удалён.");
    await loadUsers();
  }

  const activeRuleWarehouses = rules?.warehouses.filter((warehouse) => warehouse.status === "ACTIVE") ?? [];
  const availableDirectiveZones =
    rules?.zones.filter(
      (zone) => zone.status === "ACTIVE" && zone.warehouseId === directiveForm.warehouseId
    ) ?? [];
  const availableDirectiveLocations =
    rules?.locations.filter(
      (location) => location.status === "ACTIVE" && location.warehouseId === directiveForm.warehouseId
    ) ?? [];
  const directiveUsesZone = zoneDirectiveTypes.has(directiveForm.type);
  const userColumns: ColumnDef<StoreUserRow, unknown>[] = [
    {
      id: "user",
      header: "Сотрудник",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.user.name}</div>
          <div className="mt-1 text-xs text-muted">{row.original.user.email}</div>
        </div>
      ),
      meta: { minWidth: "260px" }
    },
    {
      id: "role",
      header: "Роль",
      cell: ({ row }) => (
        <Select
          value={row.original.role}
          onValueChange={(role) => updateRole(row.original.id, role)}
          options={roleOptions.map(([role, label]) => ({ value: role, label }))}
        />
      ),
      meta: { minWidth: "240px" }
    },
    {
      id: "actions",
      header: "Действия",
      cell: ({ row }) => (
        <ActionMenu
          items={[
            {
              label: "Удалить доступ",
              danger: true,
              onSelect: () => removeUser(row.original.id)
            }
          ]}
        />
      ),
      meta: { align: "right", minWidth: "170px" }
    }
  ];

  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Организация, права доступа и складские правила для самостоятельной WMS."
      />

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {!overview && !error ? <LoadingState message="Загрузка настроек..." /> : null}

      {overview ? (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <section className={cardClass}>
              <h2 className="text-base font-semibold">Организация</h2>
              <div className="mt-4 space-y-2 text-sm">
                <InfoRow label="Название" value={overview.organization.name} />
                <InfoRow label="Код" value={overview.organization.code} />
                <InfoRow label="Статус" value={overview.organization.active ? "Активно" : "Недоступно"} />
              </div>
            </section>

            <section className={cardClass}>
              <h2 className="text-base font-semibold">Текущий пользователь</h2>
              <div className="mt-4 space-y-2 text-sm">
                <InfoRow label="Имя" value={overview.currentUser.name} />
                <InfoRow label="Email" value={overview.currentUser.email} />
                <InfoRow label="Роль" value={roleLabels[overview.currentUser.role] ?? overview.currentUser.role} />
              </div>
            </section>

            <section className={cardClass}>
              <h2 className="text-base font-semibold">Доступ</h2>
              <p className="mt-4 text-sm text-muted">
                {overview.auth.devFallbackAllowed
                  ? "Включён локальный режим для разработки. В production используйте только вход по паролю."
                  : "Для запросов требуется вход по email и паролю."}
              </p>
            </section>
          </div>

          <section className={cardClass}>
            <h2 className="text-base font-semibold">Состояние данных</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.keys(overview.counts) as (keyof SettingsOverview["counts"])[]).map((key) => (
                <div key={key} className="rounded-md bg-surface p-3">
                  <div className="text-xs text-muted">{countLabels[key]}</div>
                  <div className="mt-1 text-xl font-semibold">{overview.counts[key]}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={cardClass}>
              <h2 className="text-base font-semibold">Права WMS</h2>
              <p className="mt-1 text-sm text-muted">Права применяются на сервере для каждого действия.</p>
              <div className="mt-4 space-y-2">
                {overview.permissions.length === 0 ? (
                  <EmptyState title="Нет складских прав" body="Попросите администратора выдать доступ к WMS." />
                ) : (
                  overview.permissions.map((permission) => {
                    const [title, description] = permissionLabels[permission] ?? [permission, ""];
                    return (
                      <div key={permission} className="rounded-md bg-surface p-3 text-sm">
                        <div className="font-medium">{title}</div>
                        <div className="text-muted">{description}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className={cardClass}>
              <h2 className="text-base font-semibold">Правила склада</h2>
              <div className="mt-4 space-y-3 text-sm text-muted">
                <p>Остатки меняются только через складской сервис движений.</p>
                <p>История движений не редактируется и не удаляется через публичный API.</p>
                <p>Отрицательный остаток запрещён, кроме явной ручной коррекции администратора с примечанием.</p>
                <p>Штрихкоды ячеек и товаров можно сканировать в рабочих потоках; неоднозначные сканы требуют уточнения.</p>
              </div>
            </section>
          </div>

          {overview.permissions.includes("wms.manageLocations") ? (
            <section className={cardClass}>
              <h2 className="text-base font-semibold">Складские правила</h2>
              <p className="mt-1 text-sm text-muted">
                Настройте простые подсказки для приёмки, размещения, сборки и будущего пополнения. Сотрудники видят
                только понятные шаги, а не технические правила.
              </p>
              {ruleMessage ? <div className="mt-4 rounded-md bg-surface p-3 text-sm text-muted">{ruleMessage}</div> : null}

              {!rules ? <LoadingState message="Загрузка правил..." /> : null}

              {rules ? (
                <div className="mt-4 grid gap-5 xl:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold">Шаблоны заданий</h3>
                    <p className="mt-1 text-sm text-muted">
                      Какие виды складских заданий используются на выбранном складе.
                    </p>
                    <form onSubmit={createTemplate} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Select
                        value={templateForm.warehouseId}
                        onValueChange={(warehouseId) => setTemplateForm((current) => ({ ...current, warehouseId }))}
                        placeholder="Склад"
                        options={activeRuleWarehouses.map((warehouse) => ({
                          value: warehouse.id,
                          label: `${warehouse.code} - ${warehouse.name}`
                        }))}
                      />
                      <Select
                        value={templateForm.type}
                        onValueChange={(type) => setTemplateForm((current) => ({ ...current, type }))}
                        options={Object.entries(workTemplateLabels).map(([type, label]) => ({ value: type, label }))}
                      />
                      <input
                        className={inputClass}
                        value={templateForm.name}
                        onChange={(event) =>
                          setTemplateForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Например: Сборка по ячейкам"
                        required
                      />
                      <input
                        className={inputClass}
                        value={templateForm.priority}
                        onChange={(event) =>
                          setTemplateForm((current) => ({ ...current, priority: event.target.value }))
                        }
                        inputMode="numeric"
                        placeholder="Приоритет"
                      />
                      <button className={buttonClass} type="submit">
                        Добавить шаблон
                      </button>
                    </form>

                    <div className="mt-3 space-y-2">
                      {rules.workTemplates.length === 0 ? (
                        <EmptyState title="Шаблонов пока нет" body="Добавьте только те задания, которые реально используются." />
                      ) : (
                        rules.workTemplates.map((template) => (
                          <div key={template.id} className="rounded-md bg-surface p-3 text-sm">
                            <div className="font-medium">{template.name}</div>
                            <div className="text-muted">
                              {template.warehouse.code} · {workTemplateLabels[template.type] ?? template.type} · приоритет{" "}
                              {template.priority}
                            </div>
                            <button
                              className={`${dangerButtonClass} mt-3`}
                              disabled={!template.active}
                              type="button"
                              onClick={() => deactivateRule("WORK_TEMPLATE", template.id)}
                            >
                              {template.active ? "Отключить" : "Отключено"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">Правила ячеек</h3>
                    <p className="mt-1 text-sm text-muted">
                      Укажите ячейку приёмки, приоритетные ячейки сборки и зоны для размещения или пополнения.
                    </p>
                    <form onSubmit={createDirective} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Select
                        value={directiveForm.warehouseId}
                        onValueChange={(warehouseId) =>
                          setDirectiveForm((current) => ({
                            ...current,
                            warehouseId,
                            zoneId: "",
                            locationId: ""
                          }))
                        }
                        placeholder="Склад"
                        options={activeRuleWarehouses.map((warehouse) => ({
                          value: warehouse.id,
                          label: `${warehouse.code} - ${warehouse.name}`
                        }))}
                      />
                      <Select
                        value={directiveForm.type}
                        onValueChange={(type) =>
                          setDirectiveForm((current) => ({
                            ...current,
                            type,
                            zoneId: "",
                            locationId: ""
                          }))
                        }
                        options={Object.entries(directiveLabels).map(([type, label]) => ({ value: type, label }))}
                      />
                      <input
                        className={inputClass}
                        value={directiveForm.name}
                        onChange={(event) =>
                          setDirectiveForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Короткое название"
                        required
                      />
                      <input
                        className={inputClass}
                        value={directiveForm.priority}
                        onChange={(event) =>
                          setDirectiveForm((current) => ({ ...current, priority: event.target.value }))
                        }
                        inputMode="numeric"
                        placeholder="Приоритет"
                      />
                      {directiveUsesZone ? (
                        <Select
                          value={directiveForm.zoneId}
                          onValueChange={(zoneId) => setDirectiveForm((current) => ({ ...current, zoneId }))}
                          placeholder="Зона"
                          options={availableDirectiveZones.map((zone) => ({
                            value: zone.id,
                            label: `${zone.code} - ${zone.name}`
                          }))}
                        />
                      ) : (
                        <Select
                          value={directiveForm.locationId}
                          onValueChange={(locationId) => setDirectiveForm((current) => ({ ...current, locationId }))}
                          placeholder="Ячейка"
                          options={availableDirectiveLocations.map((location) => ({
                            value: location.id,
                            label: location.code
                          }))}
                        />
                      )}
                      <button className={buttonClass} type="submit">
                        Добавить правило
                      </button>
                    </form>

                    <div className="mt-3 space-y-2">
                      {rules.locationDirectives.length === 0 ? (
                        <EmptyState title="Правил пока нет" body="Начните с ячейки приёмки по умолчанию." />
                      ) : (
                        rules.locationDirectives.map((directive) => (
                          <div key={directive.id} className="rounded-md bg-surface p-3 text-sm">
                            <div className="font-medium">{directive.name}</div>
                            <div className="text-muted">
                              {directive.warehouse.code} · {directiveLabels[directive.type] ?? directive.type} ·{" "}
                              {directive.zone?.code ?? directive.location?.code ?? "цель не выбрана"} · приоритет{" "}
                              {directive.priority}
                            </div>
                            <button
                              className={`${dangerButtonClass} mt-3`}
                              disabled={!directive.active}
                              type="button"
                              onClick={() => deactivateRule("LOCATION_DIRECTIVE", directive.id)}
                            >
                              {directive.active ? "Отключить" : "Отключено"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className={cardClass}>
            <h2 className="text-base font-semibold">Организации</h2>
            <p className="mt-1 text-sm text-muted">
              Выбор организации сохраняется в защищённой сессии и применяется ко всем запросам WMS.
            </p>
            {organizationMessage ? (
              <div className="mt-4 rounded-md bg-surface p-3 text-sm text-muted">{organizationMessage}</div>
            ) : null}
            {overview.permissions.includes("org.manage") ? (
              <form onSubmit={addOrganization} className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <input
                  className={inputClass}
                  value={organizationForm.name}
                  onChange={(event) =>
                    setOrganizationForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Название организации"
                />
                <input
                  className={inputClass}
                  value={organizationForm.code}
                  onChange={(event) =>
                    setOrganizationForm((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder="Код"
                />
                <button className={buttonClass} type="submit">
                  Создать
                </button>
              </form>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {organizations.map((membership) => {
                const isCurrent = membership.store.id === overview.organization.id;
                return (
                  <div key={membership.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                    <div className="font-semibold">{membership.store.name}</div>
                    <div className="text-muted">{membership.store.code}</div>
                    <div className="mt-2 text-xs text-muted">Роль: {roleLabels[membership.role] ?? membership.role}</div>
                    <button
                      className={`${secondaryButtonClass} mt-3`}
                      type="button"
                      disabled={isCurrent}
                      onClick={() => switchOrganization(membership.store.id)}
                    >
                      {isCurrent ? "Выбрана" : "Выбрать"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {overview.permissions.includes("users.manage") ? (
            <section className={cardClass}>
              <h2 className="text-base font-semibold">Пользователи</h2>
              <p className="mt-1 text-sm text-muted">
                Добавляйте сотрудников в текущую организацию и назначайте им роль.
              </p>
              {userMessage ? <div className="mt-4 rounded-md bg-surface p-3 text-sm text-muted">{userMessage}</div> : null}

              <form onSubmit={addUser} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_180px_auto]">
                <input
                  className={inputClass}
                  value={userForm.name}
                  onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Имя"
                />
                <input
                  className={inputClass}
                  value={userForm.email}
                  onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="email@example.com"
                  type="email"
                />
                <Select
                  value={userForm.role}
                  onValueChange={(role) => setUserForm((current) => ({ ...current, role }))}
                  options={roleOptions.map(([role, label]) => ({ value: role, label }))}
                />
                <input
                  className={inputClass}
                  value={userForm.initialPassword}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, initialPassword: event.target.value }))
                  }
                  placeholder="Временный пароль"
                  type="password"
                  minLength={10}
                />
                <button className={buttonClass} type="submit">
                  Добавить
                </button>
              </form>

              <DataTable className="mt-4" data={users} columns={userColumns} getRowId={(row) => row.id} />
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
