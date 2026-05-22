"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState, SuccessState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { Button, DataTable, Select } from "@/components/ui";
import { BarcodeSymbol } from "@/components/wms/BarcodeSymbol";

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

  function printLabels() {
    document.body.classList.add("wms-printing-labels");
    window.print();
    window.setTimeout(() => document.body.classList.remove("wms-printing-labels"), 500);
  }

  const columns: ColumnDef<BarcodeLabel, unknown>[] = [
    {
      id: "preview",
      header: "Этикетка",
      cell: ({ row }) => <BarcodeSymbol value={row.original.code} />,
      meta: { minWidth: "210px" }
    },
    {
      id: "code",
      header: "Код",
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.code}</span>,
      meta: { minWidth: "180px", sortValue: (row) => row.code }
    },
    {
      id: "type",
      header: "Тип",
      cell: ({ row }) => labelTypes.find((item) => item.value === row.original.type)?.label ?? row.original.type,
      meta: { minWidth: "150px", sortValue: (row) => row.type }
    },
    {
      id: "target",
      header: "Объект",
      cell: ({ row }) => labelTarget(row.original),
      meta: { minWidth: "260px", sortValue: (row) => labelTarget(row) }
    },
    {
      id: "note",
      header: "Примечание",
      cell: ({ row }) => <span className="text-muted">{row.original.note ?? "Нет"}</span>,
      meta: { minWidth: "180px" }
    }
  ];

  return (
    <div>
      <style jsx global>{`
        @media print {
          body.wms-printing-labels {
            background: white;
          }
          body.wms-printing-labels .wms-no-print {
            display: none !important;
          }
          body.wms-printing-labels .wms-print-labels {
            display: grid !important;
          }
        }
      `}</style>
      <div className="wms-no-print">
        <PageHeader
          title="Штрихкоды"
          description="Регистрируйте дополнительные штрихкоды для товаров, вариантов и ячеек. Один код не может указывать на разные объекты."
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={printLabels} disabled={labels.length === 0}>
                Печать этикеток
              </Button>
              <a className={secondaryButtonClass} href="/api/barcode-labels?format=csv">
                Скачать CSV
              </a>
            </div>
          }
        />

        <form onSubmit={createLabel} className={`${cardClass} mb-6 grid gap-4 md:grid-cols-5`}>
          <Field label="Тип">
            <Select
              value={type}
              onValueChange={(nextType) => setType(nextType as LabelType)}
              options={labelTypes}
            />
          </Field>
          <Field label="Объект">
            <Select
              value={targetId}
              onValueChange={setTargetId}
              placeholder="Выберите"
              options={targetOptions.map((option) => ({ value: option.id, label: option.label }))}
            />
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

        {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
        {message ? <div className="mb-4"><SuccessState message={message} /></div> : null}

        {loading ? (
          <LoadingState message="Загрузка штрихкодов..." />
        ) : labels.length === 0 ? (
          <EmptyState title="Штрихкодов пока нет" body="Добавьте первый код для товара или ячейки, чтобы упростить сканирование." />
        ) : (
          <DataTable data={labels} columns={columns} getRowId={(row) => row.id} />
        )}
      </div>
      <div className="wms-print-labels hidden grid-cols-2 gap-4 bg-white p-6 text-ink">
        {labels.map((label) => (
          <div key={label.id} className="break-inside-avoid rounded-md border border-slate-300 p-4">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
              {labelTypes.find((item) => item.value === label.type)?.label ?? "Штрихкод"}
            </div>
            <BarcodeSymbol value={label.code} className="mb-2" />
            <div className="text-sm font-semibold">{labelTarget(label)}</div>
            {label.note ? <div className="mt-1 text-xs text-slate-500">{label.note}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
