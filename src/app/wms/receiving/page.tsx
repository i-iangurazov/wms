"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, Select } from "@/components/ui";
import { NoticeBanner } from "@/components/wms/NoticeBanner";
import { QuantityStepper } from "@/components/wms/QuantityStepper";
import { ScanField } from "@/components/wms/ScanField";
import { ScannerStepLayout } from "@/components/wms/ScannerStepLayout";
import { commonText, emptyStates, scannerText } from "@/lib/wmsText";

type Warehouse = { id: string; code: string; name: string; status: string };
type Location = {
  id: string;
  warehouseId: string;
  code: string;
  barcode: string | null;
  type: string;
  status: string;
  isReceivable: boolean;
};
type Product = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  variants: { id: string; sku: string; name: string; barcode: string | null }[];
};
type ReceivingLine = {
  id: string;
  productId: string;
  variantId: string | null;
  expectedQty: number;
  receivedQty: number;
  damagedQty: number;
  shortQty: number;
  exceptionNote: string | null;
  status: string;
  product: Product;
  variant: { sku: string; name: string } | null;
};
type ReceivingSession = {
  id: string;
  warehouseId: string;
  receivingLocationId: string;
  reference: string | null;
  status: string;
  warehouse: Warehouse;
  receivingLocation: Location;
  lines: ReceivingLine[];
};
type BarcodeProductResult = {
  type: "PRODUCT";
  payload: {
    productId: string;
    variantId: string | null;
  };
};

export default function ReceivingPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sessions, setSessions] = useState<ReceivingSession[]>([]);
  const [sessionForm, setSessionForm] = useState({ warehouseId: "", receivingLocationId: "", reference: "" });
  const [lineForm, setLineForm] = useState({ sessionId: "", productId: "", variantId: "", expectedQty: 1 });
  const [receiveQtyByLine, setReceiveQtyByLine] = useState<Record<string, number>>({});
  const [damagedQtyByLine, setDamagedQtyByLine] = useState<Record<string, number>>({});
  const [overReceiptByLine, setOverReceiptByLine] = useState<Record<string, boolean>>({});
  const [noteByLine, setNoteByLine] = useState<Record<string, string>>({});
  const [shortCloseNoteBySession, setShortCloseNoteBySession] = useState<Record<string, string>>({});
  const receiveKeysRef = useRef<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const receivingLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.type === "RECEIVING" &&
          location.status === "ACTIVE" &&
          location.isReceivable &&
          (!sessionForm.warehouseId || location.warehouseId === sessionForm.warehouseId)
      ),
    [locations, sessionForm.warehouseId]
  );

  async function loadData() {
    setLoading(true);
    const [warehouseResponse, locationResponse, productResponse, sessionResponse] = await Promise.all([
      fetch("/api/warehouses", { cache: "no-store" }),
      fetch("/api/warehouse-locations", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/receiving/sessions", { cache: "no-store" })
    ]);
    const warehousePayload = (await warehouseResponse.json()) as { warehouses?: Warehouse[]; error?: string };
    const locationPayload = (await locationResponse.json()) as { locations?: Location[]; error?: string };
    const productPayload = (await productResponse.json()) as { products?: Product[]; error?: string };
    const sessionPayload = (await sessionResponse.json()) as { sessions?: ReceivingSession[]; error?: string };
    if (!warehouseResponse.ok || !locationResponse.ok || !productResponse.ok || !sessionResponse.ok) {
      setError(
        warehousePayload.error ??
          locationPayload.error ??
          productPayload.error ??
          sessionPayload.error ??
          "Не удалось загрузить данные приёмки."
      );
    } else {
      const nextWarehouses = warehousePayload.warehouses ?? [];
      const nextLocations = locationPayload.locations ?? [];
      const nextProducts = productPayload.products ?? [];
      const nextSessions = sessionPayload.sessions ?? [];
      setWarehouses(nextWarehouses);
      setLocations(nextLocations);
      setProducts(nextProducts);
      setSessions(nextSessions);
      setSessionForm((current) => ({
        ...current,
        warehouseId: current.warehouseId || nextWarehouses[0]?.id || "",
        receivingLocationId:
          current.receivingLocationId ||
          nextLocations.find((location) => location.type === "RECEIVING" && location.status === "ACTIVE")?.id ||
          ""
      }));
      setLineForm((current) => ({
        ...current,
        sessionId: current.sessionId || nextSessions.find((session) => session.status === "RECEIVING")?.id || "",
        productId: current.productId || nextProducts[0]?.id || ""
      }));
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function selectScannedProduct(scan: string) {
    const response = await fetch(`/api/barcode/resolve?type=PRODUCT&scan=${encodeURIComponent(scan)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { result?: BarcodeProductResult; error?: string };
    if (!response.ok || !payload.result) {
      setError(payload.error ?? `Товар по скану ${scan} не найден.`);
      return;
    }
    setLineForm((current) => ({
      ...current,
      productId: String(payload.result?.payload.productId ?? ""),
      variantId: payload.result?.payload.variantId ? String(payload.result.payload.variantId) : ""
    }));
    setError(null);
    setMessage("Товар найден. Проверьте количество и добавьте его в приёмку.");
  }

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/receiving/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionForm)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать приёмку.");
    } else {
      setSessionForm((current) => ({ ...current, reference: "" }));
      setMessage("Приёмка создана.");
      await loadData();
    }
  }

  async function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/receiving/sessions/${lineForm.sessionId}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: lineForm.productId,
        variantId: lineForm.variantId || undefined,
        expectedQty: lineForm.expectedQty
      })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось добавить товар в приёмку.");
    } else {
      setMessage("Товар добавлен в приёмку.");
      await loadData();
    }
  }

  async function receiveLine(sessionId: string, lineId: string) {
    setError(null);
    setMessage(null);
    const quantity = receiveQtyByLine[lineId] ?? 1;
    const idempotencyKey = receiveKeysRef.current[lineId] ?? crypto.randomUUID();
    receiveKeysRef.current[lineId] = idempotencyKey;
    const response = await fetch(`/api/receiving/sessions/${sessionId}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineId,
        quantity,
        damagedQuantity: damagedQtyByLine[lineId] ?? 0,
        allowOverReceipt: overReceiptByLine[lineId] ?? false,
        note: noteByLine[lineId],
        idempotencyKey
      })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось принять товар.");
    } else {
      setMessage("Товар принят.");
      delete receiveKeysRef.current[lineId];
      await loadData();
    }
  }

  async function completeSession(id: string) {
    setError(null);
    setMessage(null);
    const note = shortCloseNoteBySession[id]?.trim();
    const response = await fetch(`/api/receiving/sessions/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowShortClose: Boolean(note), note })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось завершить приёмку.");
    } else {
      setMessage("Приёмка завершена.");
      await loadData();
    }
  }

  function columnsForSession(session: ReceivingSession): ColumnDef<ReceivingLine, unknown>[] {
    return [
      {
        id: "product",
        header: commonText.product,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.product.sku}</div>
            {row.original.variant ? (
              <div className="mt-1 text-xs text-muted">{row.original.variant.sku}</div>
            ) : null}
          </div>
        ),
        meta: { minWidth: "180px" }
      },
      {
        id: "expected",
        header: "Ожидали",
        cell: ({ row }) => <span className="tabular-nums">{row.original.expectedQty}</span>,
        meta: { minWidth: "95px" }
      },
      {
        id: "received",
        header: "Принято",
        cell: ({ row }) => <span className="tabular-nums">{row.original.receivedQty}</span>,
        meta: { minWidth: "95px" }
      },
      {
        id: "damaged",
        header: "Повреждено",
        cell: ({ row }) => <span className="tabular-nums">{row.original.damagedQty}</span>,
        meta: { minWidth: "115px" }
      },
      {
        id: "receive",
        header: "Принять",
        cell: ({ row }) => (
          <div className="flex flex-col gap-2">
            <input
              className={`${inputClass} max-w-28`}
              min={0}
              type="number"
              value={receiveQtyByLine[row.original.id] ?? 1}
              onChange={(event) =>
                setReceiveQtyByLine((current) => ({ ...current, [row.original.id]: Number(event.target.value) }))
              }
            />
            <input
              className={`${inputClass} max-w-28`}
              min={0}
              type="number"
              value={damagedQtyByLine[row.original.id] ?? 0}
              onChange={(event) =>
                setDamagedQtyByLine((current) => ({ ...current, [row.original.id]: Number(event.target.value) }))
              }
              aria-label="Повреждено"
            />
          </div>
        ),
        meta: { minWidth: "145px" }
      },
      {
        id: "exception",
        header: "Исключение",
        cell: ({ row }) => (
          <div className="flex min-w-64 flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={overReceiptByLine[row.original.id] ?? false}
                onChange={(event) =>
                  setOverReceiptByLine((current) => ({ ...current, [row.original.id]: event.target.checked }))
                }
              />
              Разрешить сверх ожидания
            </label>
            <input
              className={inputClass}
              value={noteByLine[row.original.id] ?? ""}
              onChange={(event) =>
                setNoteByLine((current) => ({ ...current, [row.original.id]: event.target.value }))
              }
              placeholder="Причина, если есть расхождение"
            />
            {row.original.shortQty > 0 ? (
              <span className="text-xs text-red-700">Недопоставка: {row.original.shortQty}</span>
            ) : null}
            {row.original.exceptionNote ? <span className="text-xs text-muted">{row.original.exceptionNote}</span> : null}
          </div>
        ),
        meta: { minWidth: "290px" }
      },
      {
        id: "actions",
        header: commonText.actions,
        cell: ({ row }) => (
          <button
            className={secondaryButtonClass}
            disabled={
              row.original.status === "RECEIVED" ||
              row.original.status === "CLOSED_SHORT" ||
              row.original.status === "OVER_RECEIVED" ||
              session.status === "COMPLETED"
            }
            type="button"
            onClick={() => void receiveLine(session.id, row.original.id)}
          >
            Принять
          </button>
        ),
        meta: { align: "right", minWidth: "120px" }
      }
    ];
  }

  return (
    <div>
      <PageHeader
        title="Приёмка"
        description="Примите товар в зону приёмки. После этого его можно разместить по ячейкам."
      />
      <NoticeBanner kind="error" message={error} />
      <NoticeBanner kind="success" message={message} />
      {loading ? <LoadingState message="Загрузка приёмки..." /> : null}

      <ScannerStepLayout
        title="Примите товар"
        instruction="Создайте приёмку, отсканируйте товар и подтвердите количество по каждой строке."
        scanHint="Сканируйте SKU или штрихкод товара."
        resultHint="Товар появится в ячейке приёмки и будет готов к размещению."
      >
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={createSession} className={cardClass}>
          <h2 className="mb-4 text-base font-semibold">Новая приёмка</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={commonText.warehouse}>
              <Select
                value={sessionForm.warehouseId}
                onValueChange={(warehouseId) =>
                  setSessionForm((current) => ({ ...current, warehouseId, receivingLocationId: "" }))
                }
                placeholder="Выберите склад"
                options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.code }))}
              />
            </Field>
            <Field label="Ячейка приёмки">
              <Select
                value={sessionForm.receivingLocationId}
                onValueChange={(receivingLocationId) => setSessionForm((current) => ({ ...current, receivingLocationId }))}
                placeholder="Выберите ячейку"
                options={receivingLocations.map((location) => ({ value: location.id, label: location.code }))}
              />
            </Field>
            <Field label={commonText.reference}>
              <input
                className={inputClass}
                value={sessionForm.reference}
                onChange={(event) => setSessionForm((current) => ({ ...current, reference: event.target.value }))}
                placeholder="Номер поставки или накладной"
              />
            </Field>
            <div className="flex items-end">
              <button className={buttonClass} type="submit">
                {commonText.create}
              </button>
            </div>
          </div>
        </form>

        <form onSubmit={addLine} className={cardClass}>
          <h2 className="mb-4 text-base font-semibold">Добавить товар</h2>
          <ScanField
            label={scannerText.product}
            placeholder="SKU или штрихкод"
            autoFocus
            onScan={(scan) => void selectScannedProduct(scan)}
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Приёмка">
              <Select
                value={lineForm.sessionId}
                onValueChange={(sessionId) => setLineForm((current) => ({ ...current, sessionId }))}
                placeholder="Выберите приёмку"
                options={sessions
                  .filter((session) => session.status === "RECEIVING")
                  .map((session) => ({ value: session.id, label: session.reference ?? session.id.slice(0, 8) }))}
              />
            </Field>
            <Field label={commonText.product}>
              <Select
                value={lineForm.productId}
                onValueChange={(productId) => setLineForm((current) => ({ ...current, productId, variantId: "" }))}
                placeholder="Выберите товар"
                options={products.map((product) => ({ value: product.id, label: `${product.sku} - ${product.name}` }))}
              />
            </Field>
            <QuantityStepper
              label="Ожидаемое количество"
              min={0}
              value={lineForm.expectedQty}
              onChange={(expectedQty) => setLineForm((current) => ({ ...current, expectedQty }))}
            />
            <div className="flex items-end">
              <button className={buttonClass} type="submit">
                Добавить товар
              </button>
            </div>
          </div>
        </form>
      </div>
      </ScannerStepLayout>

      <div className="mt-6 space-y-4">
        {sessions.length === 0 && !loading ? (
          <EmptyState title={emptyStates.receivingTitle} body={emptyStates.receivingBody} />
        ) : null}
        {sessions.map((session) => (
          <section key={session.id} className={cardClass}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold">{session.reference ?? session.id.slice(0, 8)}</div>
                <div className="text-sm text-muted">
                  {session.warehouse.code} / {session.receivingLocation.code}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={session.status} />
                <button
                  className={secondaryButtonClass}
                  disabled={session.status === "COMPLETED"}
                  type="button"
                  onClick={() => void completeSession(session.id)}
                >
                  {commonText.complete}
                </button>
              </div>
            </div>
            <DataTable data={session.lines} columns={columnsForSession(session)} getRowId={(row) => row.id} />
            {session.status !== "COMPLETED" ? (
              <div className="mt-4 rounded-md bg-surface p-3">
                <Field label="Причина закрытия с недопоставкой">
                  <input
                    className={inputClass}
                    value={shortCloseNoteBySession[session.id] ?? ""}
                    onChange={(event) =>
                      setShortCloseNoteBySession((current) => ({ ...current, [session.id]: event.target.value }))
                    }
                    placeholder="Например: поставщик привёз не всё"
                  />
                </Field>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
