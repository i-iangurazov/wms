"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, Field, inputClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { NoticeBanner } from "@/components/wms/NoticeBanner";
import { QuantityStepper } from "@/components/wms/QuantityStepper";
import { ScanField } from "@/components/wms/ScanField";
import { ScannerStepLayout } from "@/components/wms/ScannerStepLayout";
import { WorkerTaskCard } from "@/components/wms/WorkerTaskCard";
import { createIdempotencyKey } from "@/lib/idempotency";
import { commonText, emptyStates, labelFor, locationTypeLabels, scannerText } from "@/lib/wmsText";

type Location = {
  id: string;
  code: string;
  barcode: string | null;
  type: string;
  status: string;
};
type Product = { id: string; sku: string; name: string; barcode: string | null };
type Balance = {
  id: string;
  quantity: number;
  onHandQty: number;
  availableQty: number;
  locationId: string;
  productId: string;
  product: Product;
  location: Location;
};

export default function PutAwayPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [form, setForm] = useState({ fromLocationId: "", toLocationId: "", productId: "", quantity: 1, note: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const receivingLocations = useMemo(
    () => locations.filter((location) => location.status === "ACTIVE" && location.type === "RECEIVING"),
    [locations]
  );
  const destinations = useMemo(
    () =>
      locations.filter(
        (location) => location.status === "ACTIVE" && (location.type === "STORAGE" || location.type === "PICKING")
      ),
    [locations]
  );
  const receivingBalances = balances.filter(
    (balance) => balance.location.type === "RECEIVING" && balance.availableQty > 0
  );
  const selectedBalance = receivingBalances.find(
    (balance) => balance.locationId === form.fromLocationId && balance.productId === form.productId
  );

  async function loadData() {
    const [locationResponse, productResponse, balanceResponse] = await Promise.all([
      fetch("/api/warehouse-locations", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/inventory/balances", { cache: "no-store" })
    ]);
    const locationPayload = (await locationResponse.json()) as { locations?: Location[]; error?: string };
    const productPayload = (await productResponse.json()) as { products?: Product[]; error?: string };
    const balancePayload = (await balanceResponse.json()) as { balances?: Balance[]; error?: string };
    if (!locationResponse.ok || !productResponse.ok || !balanceResponse.ok) {
      setError(locationPayload.error ?? productPayload.error ?? balancePayload.error ?? "Не удалось загрузить размещение.");
      return;
    }
    const nextLocations = locationPayload.locations ?? [];
    const nextProducts = productPayload.products ?? [];
    setLocations(nextLocations);
    setProducts(nextProducts);
    setBalances(balancePayload.balances ?? []);
    setForm((current) => ({
      ...current,
      fromLocationId: current.fromLocationId || nextLocations.find((location) => location.type === "RECEIVING")?.id || "",
      toLocationId: current.toLocationId || nextLocations.find((location) => location.type === "PICKING")?.id || "",
      productId: current.productId || nextProducts[0]?.id || ""
    }));
  }

  useEffect(() => {
    void loadData();
  }, []);

  function selectScannedProduct(scan: string) {
    const product = products.find((item) => item.sku === scan || item.barcode === scan);
    if (!product) {
      setError(`Товар по скану ${scan} не найден.`);
      return;
    }
    setForm((current) => ({ ...current, productId: product.id }));
    setError(null);
  }

  async function submitPutAway(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/put-away", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, idempotencyKey: createIdempotencyKey("putaway") })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось разместить товар.");
    } else {
      setMessage("Товар размещён.");
      await loadData();
    }
  }

  return (
    <div>
      <PageHeader
        title="Размещение"
        description="Переместите принятый товар из зоны приёмки в ячейку хранения или сборки."
      />
      <NoticeBanner kind="error" message={error} />
      <NoticeBanner kind="success" message={message} />
      <ScannerStepLayout
        title="Разместите принятый товар"
        instruction="Выберите товар из зоны приёмки, укажите ячейку назначения и подтвердите количество."
        scanHint="Сканируйте товар. Затем проверьте ячейку приёмки и ячейку назначения."
        resultHint="Товар уйдёт из приёмки и появится в выбранной ячейке."
        aside={
          <div className="rounded-lg border border-border bg-panel p-4 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Товар в зоне приёмки</h2>
            {receivingBalances.length === 0 ? (
              <EmptyState title={emptyStates.putawayTitle} body={emptyStates.putawayBody} />
            ) : (
              <div className="space-y-2">
                {receivingBalances.map((balance) => (
                  <WorkerTaskCard
                    key={balance.id}
                    title={`${balance.product.sku} / ${balance.location.code}`}
                    details={`Доступно: ${balance.availableQty}`}
                    meta={balance.product.name}
                    actionLabel="Выбрать"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        fromLocationId: balance.locationId,
                        productId: balance.productId,
                        quantity: Math.min(Math.max(current.quantity, 1), balance.availableQty)
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        }
      >
        <form onSubmit={submitPutAway} className="rounded-lg border border-border bg-panel p-4 shadow-sm">
          <ScanField
            label={scannerText.product}
            placeholder="SKU или штрихкод"
            autoFocus
            onScan={selectScannedProduct}
          />
          <div className="mt-4 grid gap-4">
            <Field label="Откуда">
              <select
                className={inputClass}
                value={form.fromLocationId}
                onChange={(event) => setForm((current) => ({ ...current, fromLocationId: event.target.value }))}
                required
              >
                <option value="">Выберите ячейку приёмки</option>
                {receivingLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code}
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
            <Field label="Куда">
              <select
                className={inputClass}
                value={form.toLocationId}
                onChange={(event) => setForm((current) => ({ ...current, toLocationId: event.target.value }))}
                required
              >
                <option value="">Выберите ячейку</option>
                {destinations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code} ({labelFor(locationTypeLabels, location.type)})
                  </option>
                ))}
              </select>
            </Field>
            <QuantityStepper
              label={commonText.quantity}
              value={form.quantity}
              max={selectedBalance?.availableQty}
              onChange={(quantity) => setForm((current) => ({ ...current, quantity }))}
            />
            <button className={buttonClass} type="submit">
              Разместить товар
            </button>
          </div>
        </form>
      </ScannerStepLayout>
    </div>
  );
}
