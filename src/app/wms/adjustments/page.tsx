"use client";

import { FormEvent, useEffect, useState } from "react";
import { LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { Select } from "@/components/ui";
import { NoticeBanner } from "@/components/wms/NoticeBanner";
import { ScanField } from "@/components/wms/ScanField";
import { ScannerStepLayout } from "@/components/wms/ScannerStepLayout";
import { createIdempotencyKey } from "@/lib/idempotency";
import {
  adjustmentReasonLabels,
  commonText,
  labelFor,
  locationTypeLabels,
  scannerText
} from "@/lib/wmsText";

type Location = { id: string; code: string; barcode: string | null; type: string; status: string };
type Product = { id: string; sku: string; name: string; barcode: string | null };
type BarcodeResult = {
  type: "LOCATION" | "PRODUCT";
  payload: {
    id?: string;
    productId?: string;
  };
};

const reasons = [
  "DAMAGED",
  "LOST",
  "FOUND",
  "COUNT_CORRECTION",
  "MANUAL_CORRECTION",
  "EXPIRED",
  "RETURNED_TO_STOCK"
];

export default function AdjustmentsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    locationId: "",
    productId: "",
    quantityDelta: 1,
    reason: "FOUND",
    targetState: "ON_HAND",
    note: "",
    allowNegative: false
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [locationResponse, productResponse] = await Promise.all([
      fetch("/api/warehouse-locations", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" })
    ]);
    const locationPayload = (await locationResponse.json()) as { locations?: Location[]; error?: string };
    const productPayload = (await productResponse.json()) as { products?: Product[]; error?: string };
    if (!locationResponse.ok || !productResponse.ok) {
      setError(locationPayload.error ?? productPayload.error ?? "Не удалось загрузить корректировку.");
      setLoading(false);
      return;
    }
    const activeLocations = (locationPayload.locations ?? []).filter((location) => location.status === "ACTIVE");
    const nextProducts = productPayload.products ?? [];
    setLocations(activeLocations);
    setProducts(nextProducts);
    setForm((current) => ({
      ...current,
      locationId: current.locationId || activeLocations[0]?.id || "",
      productId: current.productId || nextProducts[0]?.id || ""
    }));
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function selectScannedProduct(scan: string) {
    const response = await fetch(`/api/barcode/resolve?type=PRODUCT&scan=${encodeURIComponent(scan)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { result?: BarcodeResult; error?: string };
    if (!response.ok || !payload.result?.payload.productId) {
      setError(payload.error ?? `Товар по скану ${scan} не найден.`);
      return;
    }
    setForm((current) => ({ ...current, productId: String(payload.result?.payload.productId) }));
    setError(null);
  }

  async function selectScannedLocation(scan: string) {
    const response = await fetch(`/api/barcode/resolve?type=LOCATION&scan=${encodeURIComponent(scan)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { result?: BarcodeResult; error?: string };
    if (!response.ok || !payload.result?.payload.id) {
      setError(payload.error ?? `Ячейка по скану ${scan} не найдена.`);
      return;
    }
    setForm((current) => ({ ...current, locationId: String(payload.result?.payload.id) }));
    setError(null);
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const response = await fetch("/api/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, idempotencyKey: createIdempotencyKey("adjustment") })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось обновить остаток.");
    } else {
      setMessage("Остаток обновлён.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Корректировки"
        description="Исправляйте остатки только с причиной и примечанием для ручных корректировок."
      />
      <NoticeBanner kind="error" message={error} />
      <NoticeBanner kind="success" message={message} />
      {loading ? <LoadingState message="Загрузка корректировки..." /> : null}
      <ScannerStepLayout
        title="Скорректируйте остаток"
        instruction="Выберите ячейку, товар, тип корректировки, причину и изменение количества. Для ручной коррекции обязательно примечание."
        scanHint="Сканируйте ячейку и товар."
        resultHint="Будет создана запись в истории движений, а остаток изменится через складской сервис."
      >
      <form onSubmit={submitAdjustment} className={`max-w-3xl ${cardClass}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <ScanField
            label={scannerText.location}
            placeholder="Код или штрихкод ячейки"
            autoFocus
            onScan={(scan) => void selectScannedLocation(scan)}
          />
          <ScanField
            label={scannerText.product}
            placeholder="SKU или штрихкод"
            onScan={(scan) => void selectScannedProduct(scan)}
          />
          <Field label={commonText.location}>
            <Select
              value={form.locationId}
              onValueChange={(locationId) => setForm((current) => ({ ...current, locationId }))}
              placeholder="Выберите ячейку"
              options={locations.map((location) => ({
                value: location.id,
                label: `${location.code} (${labelFor(locationTypeLabels, location.type)})`
              }))}
            />
          </Field>
          <Field label={commonText.product}>
            <Select
              value={form.productId}
              onValueChange={(productId) => setForm((current) => ({ ...current, productId }))}
              placeholder="Выберите товар"
              options={products.map((product) => ({ value: product.id, label: `${product.sku} - ${product.name}` }))}
            />
          </Field>
          <Field label="Изменение количества">
            <input
              className={inputClass}
              type="number"
              value={form.quantityDelta}
              onChange={(event) => setForm((current) => ({ ...current, quantityDelta: Number(event.target.value) }))}
            />
          </Field>
          <Field label="Что изменить">
            <Select
              value={form.targetState}
              onValueChange={(targetState) => setForm((current) => ({ ...current, targetState }))}
              options={[
                { value: "ON_HAND", label: "Фактический остаток" },
                { value: "DAMAGED", label: "Повреждено, недоступно для продажи" },
                { value: "BLOCKED", label: "Заблокировано, требует проверки" }
              ]}
            />
          </Field>
          <Field label="Причина">
            <Select
              value={form.reason}
              onValueChange={(reason) => setForm((current) => ({ ...current, reason }))}
              options={reasons.map((reason) => ({ value: reason, label: labelFor(adjustmentReasonLabels, reason) }))}
            />
          </Field>
          <Field label={commonText.note}>
            <input
              className={inputClass}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Обязательно для ручной корректировки"
              required={form.reason === "MANUAL_CORRECTION"}
            />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowNegative}
              onChange={(event) => setForm((current) => ({ ...current, allowNegative: event.target.checked }))}
            />
            Разрешить администратору отрицательную коррекцию
          </label>
        </div>
        <div className="mt-4">
          <button className={buttonClass} type="submit">
            Создать корректировку
          </button>
        </div>
      </form>
      </ScannerStepLayout>
    </div>
  );
}
