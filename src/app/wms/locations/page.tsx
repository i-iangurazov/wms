"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, dangerButtonClass, Field, ghostButtonClass, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, Select } from "@/components/ui";
import { commonText, emptyStates, labelFor, locationTypeLabels } from "@/lib/wmsText";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
};

type Zone = {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  warehouse: Warehouse;
  _count?: { locations: number };
};

type LocationType =
  | "RECEIVING"
  | "STORAGE"
  | "PICKING"
  | "PACKING"
  | "SHIPPING"
  | "RETURNS"
  | "DAMAGED";

type Location = {
  id: string;
  warehouseId: string;
  zoneId: string | null;
  code: string;
  barcode: string | null;
  type: LocationType;
  status: "ACTIVE" | "INACTIVE";
  isPickable: boolean;
  isReceivable: boolean;
  isSellable: boolean;
  warehouse: Warehouse;
  zone: Zone | null;
};

type FormState = {
  warehouseId: string;
  zoneId: string;
  code: string;
  barcode: string;
  type: LocationType;
  status: "ACTIVE" | "INACTIVE";
  isPickable: boolean;
  isReceivable: boolean;
  isSellable: boolean;
};

const locationTypes: LocationType[] = [
  "RECEIVING",
  "STORAGE",
  "PICKING",
  "PACKING",
  "SHIPPING",
  "RETURNS",
  "DAMAGED"
];

const emptyForm: FormState = {
  warehouseId: "",
  zoneId: "",
  code: "",
  barcode: "",
  type: "STORAGE",
  status: "ACTIVE",
  isPickable: false,
  isReceivable: false,
  isSellable: false
};

function defaultsForType(type: LocationType) {
  return {
    isPickable: type === "PICKING",
    isReceivable: type === "RECEIVING" || type === "RETURNS",
    isSellable: type === "PICKING"
  };
}

export default function LocationsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [zoneForm, setZoneForm] = useState({ warehouseId: "", code: "", name: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = useMemo(
    () => locations.find((location) => location.id === editingId),
    [editingId, locations]
  );
  const activeZonesForForm = zones.filter(
    (zone) => zone.status === "ACTIVE" && zone.warehouseId === form.warehouseId
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    const [warehouseResponse, zoneResponse, locationResponse] = await Promise.all([
      fetch("/api/warehouses", { cache: "no-store" }),
      fetch("/api/warehouse-zones", { cache: "no-store" }),
      fetch("/api/warehouse-locations", { cache: "no-store" })
    ]);
    const warehousePayload = (await warehouseResponse.json()) as {
      warehouses?: Warehouse[];
      error?: string;
    };
    const locationPayload = (await locationResponse.json()) as {
      locations?: Location[];
      error?: string;
    };
    const zonePayload = (await zoneResponse.json()) as {
      zones?: Zone[];
      error?: string;
    };
    if (!warehouseResponse.ok || !zoneResponse.ok || !locationResponse.ok) {
      setError(warehousePayload.error ?? zonePayload.error ?? locationPayload.error ?? "Не удалось загрузить ячейки.");
    } else {
      const nextWarehouses = warehousePayload.warehouses ?? [];
      setWarehouses(nextWarehouses);
      setZones(zonePayload.zones ?? []);
      setLocations(locationPayload.locations ?? []);
      setForm((current) => ({
        ...current,
        warehouseId: current.warehouseId || nextWarehouses[0]?.id || ""
      }));
      setZoneForm((current) => ({
        ...current,
        warehouseId: current.warehouseId || nextWarehouses[0]?.id || ""
      }));
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  function setType(type: LocationType) {
    setForm((current) => ({ ...current, type, ...defaultsForType(type) }));
  }

  function startEdit(location: Location) {
    setEditingId(location.id);
    setForm({
      warehouseId: location.warehouseId,
      zoneId: location.zoneId ?? "",
      code: location.code,
      barcode: location.barcode ?? "",
      type: location.type,
      status: location.status,
      isPickable: location.isPickable,
      isReceivable: location.isReceivable,
      isSellable: location.isSellable
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, warehouseId: warehouses[0]?.id ?? "", zoneId: "" });
  }

  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/warehouse-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zoneForm)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать зону.");
      return;
    }
    setZoneForm({ warehouseId: zoneForm.warehouseId, code: "", name: "" });
    await loadData();
  }

  async function deactivateZone(id: string) {
    setError(null);
    const response = await fetch(`/api/warehouse-zones/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сделать зону недоступной.");
      return;
    }
    await loadData();
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch(
      editingId ? `/api/warehouse-locations/${editingId}` : "/api/warehouse-locations",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, barcode: form.barcode || undefined, zoneId: form.zoneId || null })
      }
    );
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить ячейку.");
    } else {
      resetForm();
      await loadData();
    }
    setSaving(false);
  }

  async function deactivateLocation(id: string) {
    setError(null);
    const response = await fetch(`/api/warehouse-locations/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сделать ячейку недоступной.");
    } else {
      await loadData();
    }
  }

  const columns: ColumnDef<Location, unknown>[] = [
    {
      id: "warehouse",
      header: commonText.warehouse,
      cell: ({ row }) => row.original.warehouse.code,
      meta: { minWidth: "120px" }
    },
    {
      id: "zone",
      header: "Зона",
      cell: ({ row }) => row.original.zone ? `${row.original.zone.code} · ${row.original.zone.name}` : "Без зоны",
      meta: { minWidth: "170px" }
    },
    {
      id: "code",
      header: commonText.code,
      cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      meta: { minWidth: "130px" }
    },
    {
      id: "barcode",
      header: commonText.barcode,
      cell: ({ row }) => row.original.barcode ?? "-",
      meta: { minWidth: "150px" }
    },
    {
      id: "type",
      header: commonText.type,
      cell: ({ row }) => labelFor(locationTypeLabels, row.original.type),
      meta: { minWidth: "140px" }
    },
    {
      id: "purpose",
      header: "Назначение",
      cell: ({ row }) =>
        [
          row.original.isPickable ? "Сборка" : null,
          row.original.isReceivable ? "Приёмка" : null,
          row.original.isSellable ? "Продажа" : null
        ]
          .filter(Boolean)
          .join(", ") || commonText.none,
      meta: { minWidth: "170px" }
    },
    {
      id: "status",
      header: commonText.status,
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
      meta: { minWidth: "130px" }
    },
    {
      id: "actions",
      header: commonText.actions,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <button className={ghostButtonClass} type="button" onClick={() => startEdit(row.original)}>
            {commonText.edit}
          </button>
          <button
            className={dangerButtonClass}
            disabled={row.original.status === "INACTIVE"}
            type="button"
            onClick={() => void deactivateLocation(row.original.id)}
          >
            {commonText.deactivate}
          </button>
        </div>
      ),
      meta: { align: "right", minWidth: "220px" }
    }
  ];

  return (
    <div>
      <PageHeader
        title="Склады и ячейки"
        description="Настройте склады, зоны, ячейки, штрихкоды и назначение каждой ячейки."
      />

      <section className={`${cardClass} mb-6`}>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold">Зоны</h2>
          <p className="text-sm text-muted">Зона помогает сгруппировать ячейки внутри склада. Можно оставить без зоны.</p>
        </div>
        <form onSubmit={createZone} className="grid gap-4 md:grid-cols-4">
          <Field label={commonText.warehouse}>
            <Select
              value={zoneForm.warehouseId}
              onValueChange={(warehouseId) => setZoneForm((current) => ({ ...current, warehouseId }))}
              placeholder="Выберите склад"
              options={warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: `${warehouse.code} - ${warehouse.name}`
              }))}
            />
          </Field>
          <Field label={commonText.code}>
            <input
              className={inputClass}
              value={zoneForm.code}
              onChange={(event) => setZoneForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="A"
              required
            />
          </Field>
          <Field label={commonText.name}>
            <input
              className={inputClass}
              value={zoneForm.name}
              onChange={(event) => setZoneForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Основная зона"
              required
            />
          </Field>
          <div className="flex items-end">
            <button className={buttonClass} disabled={!zoneForm.warehouseId} type="submit">
              Создать зону
            </button>
          </div>
        </form>
        {zones.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {zones.map((zone) => (
              <button
                key={zone.id}
                className="rounded-md border border-border bg-surface px-3 py-2 text-left text-sm disabled:opacity-60"
                disabled={zone.status === "INACTIVE"}
                type="button"
                onClick={() => void deactivateZone(zone.id)}
                title="Нажмите, чтобы сделать зону недоступной"
              >
                <span className="font-semibold">{zone.code}</span> · {zone.name}
                <span className="ml-2 text-xs text-muted">{zone._count?.locations ?? 0} ячеек</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <form onSubmit={saveLocation} className={`${cardClass} mb-6`}>
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Field label={commonText.warehouse}>
            <Select
              value={form.warehouseId}
              onValueChange={(warehouseId) => setForm((current) => ({ ...current, warehouseId, zoneId: "" }))}
              placeholder="Выберите склад"
              disabled={Boolean(editing)}
              options={warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: `${warehouse.code} - ${warehouse.name}`
              }))}
            />
          </Field>
          <Field label="Зона">
            <Select
              value={form.zoneId}
              onValueChange={(zoneId) => setForm((current) => ({ ...current, zoneId }))}
              emptyLabel="Без зоны"
              disabled={!form.warehouseId}
              options={activeZonesForForm.map((zone) => ({
                value: zone.id,
                label: `${zone.code} - ${zone.name}`
              }))}
            />
          </Field>
          <Field label={commonText.code}>
            <input
              className={inputClass}
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="A-01-01"
              required
            />
          </Field>
          <Field label={commonText.barcode}>
            <input
              className={inputClass}
              value={form.barcode}
              onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
              placeholder="LOC-A-01-01"
            />
          </Field>
          <Field label={commonText.type}>
            <Select
              value={form.type}
              onValueChange={(type) => setType(type as LocationType)}
              options={locationTypes.map((type) => ({ value: type, label: labelFor(locationTypeLabels, type) }))}
            />
          </Field>
          <Field label={commonText.status}>
            <Select
              value={form.status}
              onValueChange={(status) => setForm((current) => ({ ...current, status: status as FormState["status"] }))}
              options={[
                { value: "ACTIVE", label: "Активно" },
                { value: "INACTIVE", label: "Недоступно" }
              ]}
            />
          </Field>
          <div className="flex items-end gap-2">
            <button className={buttonClass} disabled={saving || !form.warehouseId} type="submit">
              {editing ? commonText.update : commonText.create}
            </button>
            {editing ? (
              <button className={secondaryButtonClass} type="button" onClick={resetForm}>
                {commonText.cancel}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {(["isPickable", "isReceivable", "isSellable"] as const).map((key) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))}
              />
              {key === "isPickable" ? "Для сборки" : key === "isReceivable" ? "Для приёмки" : "Для продажи"}
            </label>
          ))}
        </div>
      </form>

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {loading ? <LoadingState message="Загрузка ячеек..." /> : null}
      {!loading && locations.length === 0 ? (
        <EmptyState title={emptyStates.locationsTitle} body={emptyStates.locationsBody} />
      ) : null}

      {locations.length > 0 ? (
        <DataTable data={locations} columns={columns} getRowId={(row) => row.id} />
      ) : null}
    </div>
  );
}
