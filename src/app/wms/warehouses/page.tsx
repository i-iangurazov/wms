"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, dangerButtonClass, Field, ghostButtonClass, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, Select } from "@/components/ui";
import { commonText, emptyStates } from "@/lib/wmsText";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  _count?: { locations: number };
};

type FormState = {
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptyForm: FormState = { code: "", name: "", status: "ACTIVE" };

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === editingId),
    [editingId, warehouses]
  );

  async function loadWarehouses() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/warehouses", { cache: "no-store" });
    const payload = (await response.json()) as { warehouses?: Warehouse[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить склады.");
    } else {
      setWarehouses(payload.warehouses ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadWarehouses();
  }, []);

  function startEdit(warehouse: Warehouse) {
    setEditingId(warehouse.id);
    setForm({ code: warehouse.code, name: warehouse.name, status: warehouse.status });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch(editingId ? `/api/warehouses/${editingId}` : "/api/warehouses", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить склад.");
    } else {
      resetForm();
      await loadWarehouses();
    }
    setSaving(false);
  }

  async function deactivateWarehouse(id: string) {
    setError(null);
    const response = await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сделать склад недоступным.");
    } else {
      await loadWarehouses();
    }
  }

  const columns: ColumnDef<Warehouse, unknown>[] = [
    {
      id: "code",
      header: commonText.code,
      cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      meta: { minWidth: "130px" }
    },
    {
      id: "name",
      header: commonText.name,
      cell: ({ row }) => row.original.name,
      meta: { minWidth: "220px" }
    },
    {
      id: "locations",
      header: "Ячейки",
      cell: ({ row }) => <span className="tabular-nums">{row.original._count?.locations ?? 0}</span>,
      meta: { minWidth: "100px" }
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
            onClick={() => void deactivateWarehouse(row.original.id)}
          >
            {commonText.deactivate}
          </button>
        </div>
      ),
      meta: { align: "right", minWidth: "240px" }
    }
  ];

  return (
    <div>
      <PageHeader
        title="Склады"
        description="Создавайте склады и управляйте их доступностью. История операций сохраняется."
      />

      <form onSubmit={saveWarehouse} className={`${cardClass} mb-6`}>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label={commonText.code}>
            <input
              className={inputClass}
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="WH-1"
              required
            />
          </Field>
          <Field label={commonText.name}>
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Основной склад"
              required
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
            <button className={buttonClass} disabled={saving} type="submit">
              {editing ? commonText.update : commonText.create}
            </button>
            {editing ? (
              <button className={secondaryButtonClass} type="button" onClick={resetForm}>
                {commonText.cancel}
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {loading ? <LoadingState message="Загрузка складов..." /> : null}
      {!loading && warehouses.length === 0 ? (
        <EmptyState title={emptyStates.warehousesTitle} body={emptyStates.warehousesBody} />
      ) : null}

      {warehouses.length > 0 ? (
        <DataTable data={warehouses} columns={columns} getRowId={(row) => row.id} />
      ) : null}
    </div>
  );
}
