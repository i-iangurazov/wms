"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, Field, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";

type LabelType = "PRODUCT" | "PRODUCT_VARIANT" | "LOCATION";

type Product = {
  id: string;
  sku: string;
  name: string;
  variants: Array<{ id: string; sku: string; name: string; productId: string }>;
};

type Location = {
  id: string;
  code: string;
  barcode: string | null;
  warehouse: { code: string };
};

type BarcodeLabel = {
  id: string;
  code: string;
  type: LabelType | "ORDER" | "WORK";
  note: string | null;
  product: Product | null;
  variant: (Product["variants"][number] & { product: Product }) | null;
  location: Location | null;
};

const labelTypes: Array<{ value: LabelType; label: string }> = [
  { value: "PRODUCT", label: "Товар" },
  { value: "PRODUCT_VARIANT", label: "Вариант товара" },
  { value: "LOCATION", label: "Ячейка" }
];

function labelTarget(label: BarcodeLabel) {
  if (label.product) {
    return `${label.product.sku} · ${label.product.name}`;
  }
  if (label.variant) {
    return `${label.variant.sku} · ${label.variant.product.name} / ${label.variant.name}`;
  }
  if (label.location) {
    return `${label.location.code} · ${label.location.warehouse.code}`;
  }
  return "Не найдено";
}

export default function BarcodesPage() {
  const [labels, setLabels] = useState<BarcodeLabel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [type, setType] = useState<LabelType>("PRODUCT");
  const [targetId, setTargetId] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [labelsResponse, productsResponse, locationsResponse] = await Promise.all([
      fetch("/api/barcode-labels", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/warehouse-locations", { cache: "no-store" })
    ]);
    const [labelsData, productsData, locationsData] = await Promise.all([
      labelsResponse.json(),
      productsResponse.json(),
      locationsResponse.json()
    ]);
    setLabels(labelsData.labels ?? []);
    setProducts(productsData.products ?? []);
    setLocations(locationsData.locations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить штрихкоды.");
      setLoading(false);
    });
  }, []);

  const targetOptions = useMemo(() => {
    if (type === "PRODUCT") {
      return products.map((product) => ({ id: product.id, label: `${product.sku} · ${product.name}` }));
    }
    if (type === "PRODUCT_VARIANT") {
      return products.flatMap((product) =>
        product.variants.map((variant) => ({
          id: variant.id,
          label: `${variant.sku} · ${product.name} / ${variant.name}`
        }))
      );
    }
    return locations.map((location) => ({
      id: location.id,
      label: `${location.code} · ${location.warehouse.code}`
    }));
  }, [locations, products, type]);

  useEffect(() => {
    setTargetId("");
  }, [type]);

  async function createLabel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await fetch("/api/barcode-labels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, targetId, code, note })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Не удалось создать штрихкод.");
      return;
    }
    setCode("");
    setNote("");
    setMessage("Штрихкод создан.");
    await loadData();
  }

  return (
    <div>
      <PageHeader
        title="Штрихкоды"
        description="Регистрируйте дополнительные штрихкоды для товаров, вариантов и ячеек. Один код не может указывать на разные объекты."
        action={
          <a className={secondaryButtonClass} href="/api/barcode-labels?format=csv">
            Скачать CSV
          </a>
        }
      />

      <form onSubmit={createLabel} className="mb-6 grid gap-4 rounded-lg border border-border bg-panel p-4 md:grid-cols-5">
        <Field label="Тип">
          <select className={inputClass} value={type} onChange={(event) => setType(event.target.value as LabelType)}>
            {labelTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Объект">
          <select className={inputClass} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            <option value="">Выберите</option>
            {targetOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Код">
          <input className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} placeholder="SCAN-001" />
        </Field>
        <Field label="Примечание">
          <input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Необязательно" />
        </Field>
        <div className="flex items-end">
          <button className={buttonClass} type="submit" disabled={!targetId || !code}>
            Создать
          </button>
        </div>
      </form>

      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}

      {loading ? (
        <div className="text-sm text-muted">Загрузка...</div>
      ) : labels.length === 0 ? (
        <EmptyState title="Штрихкодов пока нет" body="Добавьте первый код для товара или ячейки, чтобы упростить сканирование." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-panel">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium">Объект</th>
                <th className="px-4 py-3 font-medium">Примечание</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {labels.map((label) => (
                <tr key={label.id}>
                  <td className="px-4 py-3 font-mono text-xs">{label.code}</td>
                  <td className="px-4 py-3">{labelTypes.find((item) => item.value === label.type)?.label ?? label.type}</td>
                  <td className="px-4 py-3">{labelTarget(label)}</td>
                  <td className="px-4 py-3 text-muted">{label.note ?? "Нет"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
