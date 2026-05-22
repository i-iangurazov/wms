"use client";

import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState, SuccessState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Select } from "@/components/ui";
import { QuantityStepper } from "@/components/wms/QuantityStepper";
import { ScanField } from "@/components/wms/ScanField";

type Warehouse = { id: string; code: string; name: string };
type Order = { id: string; number: string; status: string };
type WorkLine = {
  id: string;
  quantity: number;
  completedQuantity: number;
  status: string;
  product: { sku: string; name: string };
  variant: { sku: string; name: string } | null;
};
type Work = {
  id: string;
  status: string;
  sourceOrder: Order | null;
  warehouse: Warehouse;
  lines: WorkLine[];
};
type PackingPayload = {
  orders: Order[];
  work: Work[];
  warehouses: Warehouse[];
};

export default function PackingPage() {
  const [data, setData] = useState<PackingPayload | null>(null);
  const [createForm, setCreateForm] = useState({ orderId: "", warehouseId: "" });
  const [lineForms, setLineForms] = useState<Record<string, { productScan: string; quantity: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    setError(null);
    const response = await fetch("/api/packing", { cache: "no-store" });
    const payload = (await response.json()) as Partial<PackingPayload> & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить упаковку.");
      return;
    }
    const nextData = {
      orders: payload.orders ?? [],
      work: payload.work ?? [],
      warehouses: payload.warehouses ?? []
    };
    setData(nextData);
    setCreateForm((current) => ({
      orderId: current.orderId || nextData.orders.find((order) => order.status === "PICKED")?.id || "",
      warehouseId: current.warehouseId || nextData.warehouses[0]?.id || ""
    }));
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/packing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_WORK", ...createForm })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать задание на упаковку.");
      return;
    }
    setMessage("Задание на упаковку создано.");
    await loadData();
  }

  async function confirmLine(line: WorkLine) {
    setError(null);
    setMessage(null);
    const form = lineForms[line.id] ?? {
      productScan: line.variant?.sku ?? line.product.sku,
      quantity: line.quantity - line.completedQuantity
    };
    const response = await fetch("/api/packing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CONFIRM_LINE", lineId: line.id, ...form })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось подтвердить упаковку.");
      return;
    }
    setMessage("Товар проверен и упакован.");
    await loadData();
  }

  async function readyToShip(orderId: string) {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/packing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "READY_TO_SHIP", orderId })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось передать заказ в отгрузку.");
      return;
    }
    setMessage("Заказ передан в отгрузку.");
    await loadData();
  }

  function updateLine(line: WorkLine, patch: Partial<{ productScan: string; quantity: number }>) {
    setLineForms((current) => ({
      ...current,
      [line.id]: {
        productScan: current[line.id]?.productScan ?? line.variant?.sku ?? line.product.sku,
        quantity: current[line.id]?.quantity ?? line.quantity - line.completedQuantity,
        ...patch
      }
    }));
  }

  const pickedOrders = data?.orders.filter((order) => order.status === "PICKED") ?? [];

  return (
    <div>
      <PageHeader
        title="Упаковка"
        description="Проверьте собранные товары, упакуйте заказ и передайте его в отгрузку."
      />

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {message ? <div className="mb-4"><SuccessState message={message} /></div> : null}

      {!data ? <LoadingState message="Загрузка упаковки..." /> : null}
      {data ? (
        <div className="space-y-6">
          <form onSubmit={createWork} className={cardClass}>
            <h2 className="text-base font-semibold">Создать упаковку</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <Field label="Собранный заказ">
                <Select
                  value={createForm.orderId}
                  onValueChange={(orderId) => setCreateForm((current) => ({ ...current, orderId }))}
                  placeholder="Выберите заказ"
                  options={pickedOrders.map((order) => ({ value: order.id, label: order.number }))}
                />
              </Field>
              <Field label="Склад">
                <Select
                  value={createForm.warehouseId}
                  onValueChange={(warehouseId) => setCreateForm((current) => ({ ...current, warehouseId }))}
                  placeholder="Выберите склад"
                  options={data.warehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: `${warehouse.code} - ${warehouse.name}`
                  }))}
                />
              </Field>
              <div className="flex items-end">
                <button className={buttonClass} type="submit">
                  Начать упаковку
                </button>
              </div>
            </div>
          </form>

          <section className={cardClass}>
            <h2 className="text-base font-semibold">Задания</h2>
            <div className="mt-4 space-y-4">
              {data.work.length === 0 ? (
                <EmptyState title="Нет заданий на упаковку" body="Завершите сборку заказа, затем создайте упаковку." />
              ) : (
                data.work.map((work) => (
                  <div key={work.id} className="rounded-md border border-border bg-surface p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Заказ {work.sourceOrder?.number ?? "без номера"}</div>
                        <div className="text-xs text-muted">{work.warehouse.code}</div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <StatusBadge value={work.status} />
                        {work.sourceOrder ? <StatusBadge value={work.sourceOrder.status} /> : null}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {work.lines.map((line) => {
                        const remaining = line.quantity - line.completedQuantity;
                        return (
                          <div key={line.id} className="rounded-md border border-border bg-panel p-3">
                            <div className="text-sm font-medium">
                              {line.product.sku} · {line.product.name}
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              Проверено: {line.completedQuantity} / {line.quantity}
                            </div>
                            {line.status === "COMPLETED" ? (
                              <div className="mt-3 text-sm text-muted">Товар упакован</div>
                            ) : (
                              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                                <ScanField
                                  label="Отсканируйте товар"
                                  onScan={(value) => updateLine(line, { productScan: value })}
                                  placeholder={line.variant?.sku ?? line.product.sku}
                                />
                                <QuantityStepper
                                  label="Количество"
                                  value={lineForms[line.id]?.quantity ?? remaining}
                                  min={1}
                                  max={remaining}
                                  onChange={(quantity) => updateLine(line, { quantity })}
                                />
                                <div className="flex items-end">
                                  <button className={buttonClass} type="button" onClick={() => confirmLine(line)}>
                                    Проверить
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {work.status === "COMPLETED" && work.sourceOrder?.status === "PACKED" ? (
                      <button className={`${secondaryButtonClass} mt-3`} type="button" onClick={() => readyToShip(work.sourceOrder!.id)}>
                        Передать в отгрузку
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
