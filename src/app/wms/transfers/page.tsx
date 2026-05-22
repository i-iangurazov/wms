"use client";

import { FormEvent, useEffect, useState } from "react";
import { LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { NoticeBanner } from "@/components/wms/NoticeBanner";
import { QuantityStepper } from "@/components/wms/QuantityStepper";
import { ScanField } from "@/components/wms/ScanField";
import { ScannerStepLayout } from "@/components/wms/ScannerStepLayout";
import { createIdempotencyKey } from "@/lib/idempotency";
import { commonText, labelFor, locationTypeLabels, scannerText } from "@/lib/wmsText";

type Location = { id: string; code: string; barcode: string | null; type: string; status: string };
type Product = { id: string; sku: string; name: string; barcode: string | null };
type BarcodeResult = {
  type: "LOCATION" | "PRODUCT";
  payload: {
    id?: string;
    productId?: string;
  };
};

export default function TransfersPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ fromLocationId: "", toLocationId: "", productId: "", quantity: 1, note: "" });
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
      setError(locationPayload.error ?? productPayload.error ?? "Не удалось загрузить данные перемещения.");
      setLoading(false);
      return;
    }
    const activeLocations = (locationPayload.locations ?? []).filter((location) => location.status === "ACTIVE");
    const nextProducts = productPayload.products ?? [];
    setLocations(activeLocations);
    setProducts(nextProducts);
    setForm((current) => ({
      ...current,
      fromLocationId: current.fromLocationId || activeLocations[0]?.id || "",
      toLocationId: current.toLocationId || activeLocations[1]?.id || "",
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

  async function selectScannedLocation(scan: string, field: "fromLocationId" | "toLocationId") {
    const response = await fetch(`/api/barcode/resolve?type=LOCATION&scan=${encodeURIComponent(scan)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { result?: BarcodeResult; error?: string };
    if (!response.ok || !payload.result?.payload.id) {
      setError(payload.error ?? `Ячейка по скану ${scan} не найдена.`);
      return;
    }
    setForm((current) => ({ ...current, [field]: String(payload.result?.payload.id) }));
    setError(null);
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const response = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, idempotencyKey: createIdempotencyKey("transfer") })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось переместить товар.");
    } else {
      setMessage("Товар перемещён.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Перемещения"
        description="Переместите товар между ячейками после проверки источника, товара, назначения и количества."
      />
      <NoticeBanner kind="error" message={error} />
      <NoticeBanner kind="success" message={message} />
      {loading ? <LoadingState message="Загрузка перемещения..." /> : null}
      <ScannerStepLayout
        title="Переместите товар"
        instruction="Сначала подтвердите исходную ячейку, затем товар, ячейку назначения и количество."
        scanHint="Сканируйте исходную ячейку, товар и ячейку назначения."
        resultHint="Остаток спишется из исходной ячейки и появится в ячейке назначения."
      >
      <form onSubmit={submitTransfer} className={`max-w-3xl ${cardClass}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <ScanField
            label={scannerText.sourceLocation}
            placeholder="Код или штрихкод ячейки"
            autoFocus
            onScan={(scan) => void selectScannedLocation(scan, "fromLocationId")}
          />
          <ScanField
            label={scannerText.product}
            placeholder="SKU или штрихкод"
            onScan={(scan) => void selectScannedProduct(scan)}
          />
          <Field label="Откуда">
            <select
              className={inputClass}
              value={form.fromLocationId}
              onChange={(event) => setForm((current) => ({ ...current, fromLocationId: event.target.value }))}
              required
            >
              <option value="">Выберите ячейку</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} ({labelFor(locationTypeLabels, location.type)})
                </option>
              ))}
            </select>
          </Field>
          <Field label={commonText.product}>
            <select
              className={inputClass}
              value={form.productId}
              onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
              required
            >
              <option value="">Выберите товар</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
          </Field>
          <ScanField
            label={scannerText.destinationLocation}
            placeholder="Код или штрихкод ячейки"
            onScan={(scan) => void selectScannedLocation(scan, "toLocationId")}
          />
          <Field label="Куда">
            <select
              className={inputClass}
              value={form.toLocationId}
              onChange={(event) => setForm((current) => ({ ...current, toLocationId: event.target.value }))}
              required
            >
              <option value="">Выберите ячейку</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} ({labelFor(locationTypeLabels, location.type)})
                </option>
              ))}
            </select>
          </Field>
          <QuantityStepper
            label={commonText.quantity}
            value={form.quantity}
            onChange={(quantity) => setForm((current) => ({ ...current, quantity }))}
          />
          <Field label={commonText.note}>
            <input
              className={inputClass}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Необязательное примечание"
            />
          </Field>
        </div>
        <div className="mt-4">
          <button className={buttonClass} type="submit">
            Подтвердить перемещение
          </button>
        </div>
      </form>
      </ScannerStepLayout>
    </div>
  );
}
