"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass, secondaryButtonClass, tableWrapClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Select } from "@/components/ui";
import { NoticeBanner } from "@/components/wms/NoticeBanner";
import { ScannerStepLayout } from "@/components/wms/ScannerStepLayout";
import { commonText, emptyStates, labelFor, locationTypeLabels } from "@/lib/wmsText";

type Warehouse = { id: string; code: string; name: string; status: string };
type Location = { id: string; warehouseId: string; code: string; type: string; status: string };
type CountLine = {
  id: string;
  expectedQty: number;
  countedQty: number | null;
  difference: number;
  product: { sku: string; name: string };
  variant: { sku: string; name: string } | null;
};
type CountSession = {
  id: string;
  warehouseId: string;
  locationId: string;
  status: string;
  warehouse: Warehouse;
  location: Location;
  lines: CountLine[];
};

export default function CycleCountsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessions, setSessions] = useState<CountSession[]>([]);
  const [form, setForm] = useState({ warehouseId: "", locationId: "" });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const countLocations = useMemo(
    () =>
      locations.filter(
        (location) => location.status === "ACTIVE" && (!form.warehouseId || location.warehouseId === form.warehouseId)
      ),
    [locations, form.warehouseId]
  );

  async function loadData() {
    setLoading(true);
    const [warehouseResponse, locationResponse, countResponse] = await Promise.all([
      fetch("/api/warehouses", { cache: "no-store" }),
      fetch("/api/warehouse-locations", { cache: "no-store" }),
      fetch("/api/cycle-counts", { cache: "no-store" })
    ]);
    const warehousePayload = (await warehouseResponse.json()) as { warehouses?: Warehouse[]; error?: string };
    const locationPayload = (await locationResponse.json()) as { locations?: Location[]; error?: string };
    const countPayload = (await countResponse.json()) as { sessions?: CountSession[]; error?: string };
    if (!warehouseResponse.ok || !locationResponse.ok || !countResponse.ok) {
      setError(warehousePayload.error ?? locationPayload.error ?? countPayload.error ?? "Не удалось загрузить инвентаризации.");
      setLoading(false);
      return;
    }
    const nextWarehouses = warehousePayload.warehouses ?? [];
    const nextLocations = locationPayload.locations ?? [];
    setWarehouses(nextWarehouses);
    setLocations(nextLocations);
    setSessions(countPayload.sessions ?? []);
    setForm((current) => ({
      warehouseId: current.warehouseId || nextWarehouses[0]?.id || "",
      locationId: current.locationId || nextLocations[0]?.id || ""
    }));
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/cycle-counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать инвентаризацию.");
    } else {
      setMessage("Инвентаризация создана. Посчитайте товары и отправьте на проверку.");
      await loadData();
    }
  }

  async function saveCount(sessionId: string, lineId: string) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/cycle-counts/${sessionId}/lines`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, countedQty: counts[lineId] ?? 0 })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить количество.");
    } else {
      setMessage("Количество сохранено.");
      await loadData();
    }
  }

  async function postAction(id: string, action: "submit" | "approve" | "reject") {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/cycle-counts/${id}/${action}`, { method: "POST" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось выполнить действие по инвентаризации.");
    } else {
      setMessage(
        action === "submit"
          ? "Инвентаризация отправлена на проверку."
          : action === "approve"
            ? "Инвентаризация утверждена."
            : "Инвентаризация возвращена на пересчёт."
      );
      await loadData();
    }
  }

  return (
    <div>
      <PageHeader
        title="Инвентаризация"
        description="Пересчитайте товар в ячейке, проверьте расхождения и утвердите корректировки."
      />
      <NoticeBanner kind="error" message={error} />
      <NoticeBanner kind="success" message={message} />
      {loading ? <LoadingState message="Загрузка инвентаризации..." /> : null}
      <ScannerStepLayout
        title="Проверьте ячейку"
        instruction="Создайте пересчёт по складу и ячейке. Остатки не изменятся, пока менеджер не утвердит расхождения."
        scanHint="На этом шаге выберите ячейку. Скан товаров появится в следующем проходе MVP."
        resultHint="После утверждения расхождения создадут движение инвентаризации."
      >
      <form onSubmit={createSession} className={`${cardClass} mb-6`}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={commonText.warehouse}>
            <Select
              value={form.warehouseId}
              onValueChange={(warehouseId) => setForm((current) => ({ ...current, warehouseId, locationId: "" }))}
              placeholder="Выберите склад"
              options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.code }))}
            />
          </Field>
          <Field label={commonText.location}>
            <Select
              value={form.locationId}
              onValueChange={(locationId) => setForm((current) => ({ ...current, locationId }))}
              placeholder="Выберите ячейку"
              options={countLocations.map((location) => ({
                value: location.id,
                label: `${location.code} (${labelFor(locationTypeLabels, location.type)})`
              }))}
            />
          </Field>
          <div className="flex items-end">
            <button className={buttonClass} type="submit">
              Создать пересчёт
            </button>
          </div>
        </div>
      </form>
      </ScannerStepLayout>

      {sessions.length === 0 && !loading ? (
        <EmptyState title={emptyStates.countsTitle} body={emptyStates.countsBody} />
      ) : null}
      <div className="space-y-4">
        {sessions.map((session) => (
          <section key={session.id} className={cardClass}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold">
                  {session.warehouse.code} / {session.location.code}
                </div>
                <div className="text-sm text-muted">Позиций для проверки: {session.lines.length}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={session.status} />
                <button
                  className={secondaryButtonClass}
                  disabled={session.status !== "COUNTING"}
                  type="button"
                  onClick={() => void postAction(session.id, "submit")}
                >
                  Отправить на проверку
                </button>
                <button
                  className={buttonClass}
                  disabled={session.status !== "PENDING_APPROVAL"}
                  type="button"
                  onClick={() => void postAction(session.id, "approve")}
                >
                  Утвердить
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={session.status !== "PENDING_APPROVAL"}
                  type="button"
                  onClick={() => void postAction(session.id, "reject")}
                >
                  Вернуть на пересчёт
                </button>
              </div>
            </div>
            <div className={tableWrapClass}>
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">{commonText.product}</th>
                    <th className="px-3 py-2">Ожидали</th>
                    <th className="px-3 py-2">Посчитали</th>
                    <th className="px-3 py-2">Разница</th>
                    <th className="px-3 py-2 text-right">{commonText.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {session.lines.map((line) => (
                    <tr key={line.id} className="border-t border-border">
                      <td className="px-3 py-2">{line.product.sku}</td>
                      <td className="px-3 py-2">{line.expectedQty}</td>
                      <td className="px-3 py-2">
                        <input
                          className={`${inputClass} max-w-28`}
                          min={0}
                          type="number"
                          value={counts[line.id] ?? line.countedQty ?? 0}
                          onChange={(event) =>
                            setCounts((current) => ({ ...current, [line.id]: Number(event.target.value) }))
                          }
                          disabled={session.status !== "COUNTING"}
                        />
                      </td>
                      <td
                        className={`px-3 py-2 font-semibold ${
                          line.difference === 0
                            ? "text-muted"
                            : line.difference > 0
                              ? "text-emerald-700"
                              : "text-danger"
                        }`}
                      >
                        {line.difference}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className={secondaryButtonClass}
                          disabled={session.status !== "COUNTING"}
                          type="button"
                          onClick={() => void saveCount(session.id, line.id)}
                        >
                          {commonText.save}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
