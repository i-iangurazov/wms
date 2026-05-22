"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState, SuccessState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Select } from "@/components/ui";
import { ScanField } from "@/components/wms/ScanField";
import { QuantityStepper } from "@/components/wms/QuantityStepper";

type Warehouse = { id: string; code: string; name: string; status: "ACTIVE" | "INACTIVE" };
type Location = {
  id: string;
  warehouseId: string;
  zoneId: string | null;
  code: string;
  status: "ACTIVE" | "INACTIVE";
  isPickable: boolean;
};
type Zone = { id: string; warehouseId: string; code: string; name: string; status: "ACTIVE" | "INACTIVE" };
type Product = { id: string; sku: string; name: string };
type ReplenishmentRule = {
  id: string;
  warehouseId: string;
  minQty: number;
  maxQty: number;
  active: boolean;
  warehouse: Warehouse;
  product: Product;
  pickLocation: Location;
  sourceLocation: Location | null;
  sourceZone: Zone | null;
};
type WorkLine = {
  id: string;
  quantity: number;
  completedQuantity: number;
  status: string;
  sourceLocation: Location;
  destinationLocation: Location | null;
  product: Product;
};
type Work = {
  id: string;
  status: string;
  warehouse: Warehouse;
  lines: WorkLine[];
};
type ReplenishmentPayload = {
  rules: ReplenishmentRule[];
  work: Work[];
  warehouses: Warehouse[];
  locations: Location[];
  zones: Zone[];
  products: Product[];
};

const emptyRuleForm = {
  warehouseId: "",
  productId: "",
  pickLocationId: "",
  sourceLocationId: "",
  sourceZoneId: "",
  sourceMode: "LOCATION",
  minQty: "1",
  maxQty: "5"
};

export default function ReplenishmentPage() {
  const [data, setData] = useState<ReplenishmentPayload | null>(null);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [lineForms, setLineForms] = useState<Record<string, { sourceScan: string; destinationScan: string; productScan: string; quantity: number }>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/replenishment", { cache: "no-store" });
    const payload = (await response.json()) as Partial<ReplenishmentPayload> & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить пополнение.");
      setLoading(false);
      return;
    }
    const nextData = {
      rules: payload.rules ?? [],
      work: payload.work ?? [],
      warehouses: payload.warehouses ?? [],
      locations: payload.locations ?? [],
      zones: payload.zones ?? [],
      products: payload.products ?? []
    };
    setData(nextData);
    const firstWarehouse = nextData.warehouses.find((warehouse) => warehouse.status === "ACTIVE");
    setRuleForm((current) => ({ ...current, warehouseId: current.warehouseId || firstWarehouse?.id || "" }));
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const warehouseLocations = useMemo(
    () => data?.locations.filter((location) => location.warehouseId === ruleForm.warehouseId && location.status === "ACTIVE") ?? [],
    [data, ruleForm.warehouseId]
  );
  const pickLocations = warehouseLocations.filter((location) => location.isPickable);
  const sourceLocations = warehouseLocations.filter((location) => location.id !== ruleForm.pickLocationId);
  const sourceZones =
    data?.zones.filter((zone) => zone.warehouseId === ruleForm.warehouseId && zone.status === "ACTIVE") ?? [];

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/replenishment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CREATE_RULE",
        warehouseId: ruleForm.warehouseId,
        productId: ruleForm.productId,
        pickLocationId: ruleForm.pickLocationId,
        sourceLocationId: ruleForm.sourceMode === "LOCATION" ? ruleForm.sourceLocationId : undefined,
        sourceZoneId: ruleForm.sourceMode === "ZONE" ? ruleForm.sourceZoneId : undefined,
        minQty: ruleForm.minQty,
        maxQty: ruleForm.maxQty
      })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать правило пополнения.");
      return;
    }
    setRuleForm((current) => ({ ...emptyRuleForm, warehouseId: current.warehouseId }));
    setMessage("Правило пополнения создано.");
    await loadData();
  }

  async function generateWork(ruleId: string) {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/replenishment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "GENERATE_WORK", ruleId })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать задание на пополнение.");
      return;
    }
    setMessage("Задание на пополнение создано.");
    await loadData();
  }

  async function confirmLine(lineId: string) {
    setError(null);
    setMessage(null);
    const form = lineForms[lineId];
    const response = await fetch("/api/replenishment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CONFIRM_LINE", lineId, ...form })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось подтвердить пополнение.");
      return;
    }
    setMessage("Ячейка пополнена.");
    await loadData();
  }

  async function deactivateRule(id: string) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/replenishment?id=${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось отключить правило.");
      return;
    }
    setMessage("Правило отключено.");
    await loadData();
  }

  function updateLineForm(line: WorkLine, patch: Partial<{ sourceScan: string; destinationScan: string; productScan: string; quantity: number }>) {
    setLineForms((current) => ({
      ...current,
      [line.id]: {
        sourceScan: current[line.id]?.sourceScan ?? "",
        destinationScan: current[line.id]?.destinationScan ?? "",
        productScan: current[line.id]?.productScan ?? "",
        quantity: current[line.id]?.quantity ?? line.quantity - line.completedQuantity,
        ...patch
      }
    }));
  }

  return (
    <div>
      <PageHeader
        title="Пополнение"
        description="Создавайте простые правила min/max и переносите товар из хранения в ячейки сборки."
      />

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {message ? <div className="mb-4"><SuccessState message={message} /></div> : null}
      {loading ? <LoadingState message="Загрузка пополнения..." /> : null}

      {data ? (
        <div className="space-y-6">
          <form onSubmit={createRule} className={cardClass}>
            <h2 className="text-base font-semibold">Правило пополнения</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Склад">
                <Select
                  value={ruleForm.warehouseId}
                  onValueChange={(warehouseId) =>
                    setRuleForm((current) => ({
                      ...current,
                      warehouseId,
                      pickLocationId: "",
                      sourceLocationId: "",
                      sourceZoneId: ""
                    }))
                  }
                  placeholder="Выберите склад"
                  options={data.warehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: `${warehouse.code} - ${warehouse.name}`
                  }))}
                />
              </Field>
              <Field label="Товар">
                <Select
                  value={ruleForm.productId}
                  onValueChange={(productId) => setRuleForm((current) => ({ ...current, productId }))}
                  placeholder="Выберите товар"
                  options={data.products.map((product) => ({ value: product.id, label: `${product.sku} - ${product.name}` }))}
                />
              </Field>
              <Field label="Ячейка сборки">
                <Select
                  value={ruleForm.pickLocationId}
                  onValueChange={(pickLocationId) => setRuleForm((current) => ({ ...current, pickLocationId }))}
                  placeholder="Выберите ячейку"
                  options={pickLocations.map((location) => ({ value: location.id, label: location.code }))}
                />
              </Field>
              <Field label="Источник">
                <Select
                  value={ruleForm.sourceMode}
                  onValueChange={(sourceMode) =>
                    setRuleForm((current) => ({
                      ...current,
                      sourceMode,
                      sourceLocationId: "",
                      sourceZoneId: ""
                    }))
                  }
                  options={[
                    { value: "LOCATION", label: "Ячейка" },
                    { value: "ZONE", label: "Зона" }
                  ]}
                />
              </Field>
              {ruleForm.sourceMode === "LOCATION" ? (
                <Field label="Ячейка-источник">
                  <Select
                    value={ruleForm.sourceLocationId}
                    onValueChange={(sourceLocationId) => setRuleForm((current) => ({ ...current, sourceLocationId }))}
                    placeholder="Выберите ячейку"
                    options={sourceLocations.map((location) => ({ value: location.id, label: location.code }))}
                  />
                </Field>
              ) : (
                <Field label="Зона-источник">
                  <Select
                    value={ruleForm.sourceZoneId}
                    onValueChange={(sourceZoneId) => setRuleForm((current) => ({ ...current, sourceZoneId }))}
                    placeholder="Выберите зону"
                    options={sourceZones.map((zone) => ({ value: zone.id, label: `${zone.code} - ${zone.name}` }))}
                  />
                </Field>
              )}
              <Field label="Минимум">
                <input
                  className={inputClass}
                  value={ruleForm.minQty}
                  onChange={(event) => setRuleForm((current) => ({ ...current, minQty: event.target.value }))}
                  inputMode="numeric"
                  required
                />
              </Field>
              <Field label="Максимум">
                <input
                  className={inputClass}
                  value={ruleForm.maxQty}
                  onChange={(event) => setRuleForm((current) => ({ ...current, maxQty: event.target.value }))}
                  inputMode="numeric"
                  required
                />
              </Field>
              <div className="flex items-end">
                <button className={buttonClass} type="submit">
                  Создать правило
                </button>
              </div>
            </div>
          </form>

          <section className={cardClass}>
            <h2 className="text-base font-semibold">Правила</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {data.rules.length === 0 ? (
                <EmptyState title="Нет правил пополнения" body="Создайте правило min/max для ячейки сборки." />
              ) : (
                data.rules.map((rule) => (
                  <div key={rule.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                    <div className="font-medium">
                      {rule.product.sku} → {rule.pickLocation.code}
                    </div>
                    <div className="mt-1 text-muted">
                      Мин. {rule.minQty}, макс. {rule.maxQty}. Источник:{" "}
                      {rule.sourceLocation?.code ?? rule.sourceZone?.code ?? "не выбран"}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className={buttonClass} disabled={!rule.active} type="button" onClick={() => generateWork(rule.id)}>
                        Создать задание
                      </button>
                      <button
                        className={secondaryButtonClass}
                        disabled={!rule.active}
                        type="button"
                        onClick={() => deactivateRule(rule.id)}
                      >
                        {rule.active ? "Отключить" : "Отключено"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={cardClass}>
            <h2 className="text-base font-semibold">Задания на пополнение</h2>
            <div className="mt-4 space-y-4">
              {data.work.length === 0 ? (
                <EmptyState title="Нет заданий" body="Когда запас в ячейке сборки станет ниже минимума, создайте задание из правила." />
              ) : (
                data.work.map((work) => (
                  <div key={work.id} className="rounded-md border border-border bg-surface p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{work.warehouse.code}</div>
                      <StatusBadge value={work.status} />
                    </div>
                    <div className="space-y-3">
                      {work.lines.map((line) => {
                        const remaining = line.quantity - line.completedQuantity;
                        return (
                          <div key={line.id} className="rounded-md border border-border bg-panel p-3">
                            <div className="text-sm font-medium">
                              {line.product.sku}: {line.sourceLocation.code} → {line.destinationLocation?.code}
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              Осталось перенести: {remaining} из {line.quantity}
                            </div>
                            {line.status === "COMPLETED" ? (
                              <div className="mt-3 text-sm text-muted">Шаг завершён</div>
                            ) : (
                              <div className="mt-3 grid gap-3 md:grid-cols-4">
                                <ScanField
                                  label="Отсканируйте источник"
                                  onScan={(value) => updateLineForm(line, { sourceScan: value })}
                                  placeholder={line.sourceLocation.code}
                                />
                                <ScanField
                                  label="Отсканируйте ячейку сборки"
                                  onScan={(value) => updateLineForm(line, { destinationScan: value })}
                                  placeholder={line.destinationLocation?.code ?? ""}
                                />
                                <ScanField
                                  label="Отсканируйте товар"
                                  onScan={(value) => updateLineForm(line, { productScan: value })}
                                  placeholder={line.product.sku}
                                />
                                <QuantityStepper
                                  label="Количество"
                                  value={lineForms[line.id]?.quantity ?? remaining}
                                  min={1}
                                  max={remaining}
                                  onChange={(quantity) => updateLineForm(line, { quantity })}
                                />
                                <button className={buttonClass} type="button" onClick={() => confirmLine(line.id)}>
                                  Подтвердить
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
