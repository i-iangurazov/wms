"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, dangerButtonClass, Field, ghostButtonClass, inputClass, secondaryButtonClass, tableWrapClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
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
            <select
              className={inputClass}
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as FormState["status"] }))
              }
            >
              <option value="ACTIVE">Активно</option>
              <option value="INACTIVE">Недоступно</option>
            </select>
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
        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">{commonText.code}</th>
                <th className="px-4 py-3">{commonText.name}</th>
                <th className="px-4 py-3">Ячейки</th>
                <th className="px-4 py-3">{commonText.status}</th>
                <th className="px-4 py-3 text-right">{commonText.actions}</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{warehouse.code}</td>
                  <td className="px-4 py-3">{warehouse.name}</td>
                  <td className="px-4 py-3">{warehouse._count?.locations ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={warehouse.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className={ghostButtonClass} type="button" onClick={() => startEdit(warehouse)}>
                      {commonText.edit}
                    </button>
                    <button
                      className={dangerButtonClass}
                      disabled={warehouse.status === "INACTIVE"}
                      type="button"
                      onClick={() => void deactivateWarehouse(warehouse.id)}
                    >
                      {commonText.deactivate}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
