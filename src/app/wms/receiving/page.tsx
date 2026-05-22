"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass, secondaryButtonClass, tableWrapClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
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

  async function receiveLine(lineId: string) {
    setError(null);
    setMessage(null);
    const quantity = receiveQtyByLine[lineId] ?? 1;
    const idempotencyKey = receiveKeysRef.current[lineId] ?? crypto.randomUUID();
    receiveKeysRef.current[lineId] = idempotencyKey;
    const response = await fetch(`/api/receiving/sessions/${lineForm.sessionId}/receive`, {
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
              <select
                className={inputClass}
                value={sessionForm.warehouseId}
                onChange={(event) =>
                  setSessionForm((current) => ({ ...current, warehouseId: event.target.value, receivingLocationId: "" }))
                }
                required
              >
                <option value="">Выберите склад</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ячейка приёмки">
              <select
                className={inputClass}
                value={sessionForm.receivingLocationId}
                onChange={(event) => setSessionForm((current) => ({ ...current, receivingLocationId: event.target.value }))}
                required
              >
                <option value="">Выберите ячейку</option>
                {receivingLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.code}
                  </option>
                ))}
              </select>
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
              <select
                className={inputClass}
                value={lineForm.sessionId}
                onChange={(event) => setLineForm((current) => ({ ...current, sessionId: event.target.value }))}
                required
              >
                <option value="">Выберите приёмку</option>
                {sessions
                  .filter((session) => session.status === "RECEIVING")
                  .map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.reference ?? session.id.slice(0, 8)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={commonText.product}>
              <select
                className={inputClass}
                value={lineForm.productId}
                onChange={(event) => setLineForm((current) => ({ ...current, productId: event.target.value, variantId: "" }))}
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
            <div className={tableWrapClass}>
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">{commonText.product}</th>
                    <th className="px-3 py-2">Ожидали</th>
                    <th className="px-3 py-2">Принято</th>
                    <th className="px-3 py-2">Повреждено</th>
                    <th className="px-3 py-2">Принять</th>
                    <th className="px-3 py-2">Исключение</th>
                    <th className="px-3 py-2 text-right">{commonText.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {session.lines.map((line) => (
                    <tr key={line.id} className="border-t border-border">
                      <td className="px-3 py-2">{line.product.sku}</td>
                      <td className="px-3 py-2">{line.expectedQty}</td>
                      <td className="px-3 py-2">{line.receivedQty}</td>
                      <td className="px-3 py-2">{line.damagedQty}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-2">
                          <input
                            className={`${inputClass} max-w-28`}
                            min={0}
                            type="number"
                            value={receiveQtyByLine[line.id] ?? 1}
                            onChange={(event) =>
                              setReceiveQtyByLine((current) => ({ ...current, [line.id]: Number(event.target.value) }))
                            }
                          />
                          <input
                            className={`${inputClass} max-w-28`}
                            min={0}
                            type="number"
                            value={damagedQtyByLine[line.id] ?? 0}
                            onChange={(event) =>
                              setDamagedQtyByLine((current) => ({ ...current, [line.id]: Number(event.target.value) }))
                            }
                            aria-label="Повреждено"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-xs text-muted">
                            <input
                              type="checkbox"
                              checked={overReceiptByLine[line.id] ?? false}
                              onChange={(event) =>
                                setOverReceiptByLine((current) => ({ ...current, [line.id]: event.target.checked }))
                              }
                            />
                            Разрешить сверх ожидания
                          </label>
                          <input
                            className={inputClass}
                            value={noteByLine[line.id] ?? ""}
                            onChange={(event) =>
                              setNoteByLine((current) => ({ ...current, [line.id]: event.target.value }))
                            }
                            placeholder="Причина, если есть расхождение"
                          />
                          {line.shortQty > 0 ? <span className="text-xs text-red-700">Недопоставка: {line.shortQty}</span> : null}
                          {line.exceptionNote ? <span className="text-xs text-muted">{line.exceptionNote}</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className={secondaryButtonClass}
                          disabled={
                            line.status === "RECEIVED" ||
                            line.status === "CLOSED_SHORT" ||
                            line.status === "OVER_RECEIVED" ||
                            session.status === "COMPLETED"
                          }
                          type="button"
                          onClick={() => void receiveLine(line.id)}
                        >
                          Принять
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
