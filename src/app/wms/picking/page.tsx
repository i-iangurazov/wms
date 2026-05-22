"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { buttonClass, Field, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { NoticeBanner } from "@/components/wms/NoticeBanner";
import { QuantityStepper } from "@/components/wms/QuantityStepper";
import { ScannerStepLayout } from "@/components/wms/ScannerStepLayout";
import { commonText, labelFor, statusLabels } from "@/lib/wmsText";

type Warehouse = { id: string; code: string; name: string; status: string };
type Product = {
  id: string;
  sku: string;
  name: string;
  variants: { id: string; sku: string; name: string }[];
};
type Order = {
  id: string;
  number: string;
  status: string;
  lines: { id: string; quantity: number; product: { sku: string; name: string } }[];
};
type WorkLine = {
  id: string;
  quantity: number;
  pickedQuantity: number;
  status: string;
  exceptionReason: string | null;
  sourceLocation: { code: string; barcode: string | null };
  product: { sku: string; name: string; barcode: string | null };
  variant: { sku: string; name: string; barcode: string | null } | null;
};
type PickWork = {
  id: string;
  status: string;
  sourceOrder: { number: string } | null;
  warehouse: Warehouse;
  lines: WorkLine[];
};

export default function PickingPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [work, setWork] = useState<PickWork[]>([]);
  const [orderForm, setOrderForm] = useState({ number: "", productId: "", variantId: "", quantity: 1 });
  const [createForm, setCreateForm] = useState({ orderId: "", warehouseId: "" });
  const [pickInputs, setPickInputs] = useState<Record<string, { locationScan: string; productScan: string; quantity: number }>>({});
  const pickKeysRef = useRef<Record<string, string>>({});
  const allocationKeysRef = useRef<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const [warehouseResponse, productResponse, orderResponse, workResponse] = await Promise.all([
      fetch("/api/warehouses", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/orders", { cache: "no-store" }),
      fetch("/api/warehouse-work", { cache: "no-store" })
    ]);
    const warehousePayload = (await warehouseResponse.json()) as { warehouses?: Warehouse[]; error?: string };
    const productPayload = (await productResponse.json()) as { products?: Product[]; error?: string };
    const orderPayload = (await orderResponse.json()) as { orders?: Order[]; error?: string };
    const workPayload = (await workResponse.json()) as { work?: PickWork[]; error?: string };
    if (!warehouseResponse.ok || !productResponse.ok || !orderResponse.ok || !workResponse.ok) {
      setError(
        warehousePayload.error ?? productPayload.error ?? orderPayload.error ?? workPayload.error ?? "Не удалось загрузить сборку заказов."
      );
      return;
    }
    const nextWarehouses = warehousePayload.warehouses ?? [];
    const nextProducts = productPayload.products ?? [];
    const nextOrders = orderPayload.orders ?? [];
    setWarehouses(nextWarehouses);
    setProducts(nextProducts);
    setOrders(nextOrders);
    setWork(workPayload.work ?? []);
    setOrderForm((current) => ({
      ...current,
      productId: current.productId || nextProducts[0]?.id || "",
      variantId: current.variantId
    }));
    setCreateForm((current) => ({
      orderId: current.orderId || nextOrders[0]?.id || "",
      warehouseId: current.warehouseId || nextWarehouses[0]?.id || ""
    }));
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderForm)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать заказ.");
      return;
    }
    setMessage("Заказ создан. Теперь можно создать задание на сборку.");
    setOrderForm((current) => ({ number: "", productId: current.productId, variantId: "", quantity: 1 }));
    await loadData();
  }

  async function createPickWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const allocationKey = allocationKeysRef.current[createForm.orderId] ?? crypto.randomUUID();
    allocationKeysRef.current[createForm.orderId] = allocationKey;
    const allocationResponse = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "allocate", ...createForm, idempotencyKey: allocationKey })
    });
    const allocationPayload = (await allocationResponse.json()) as { error?: string };
    if (!allocationResponse.ok) {
      setError(allocationPayload.error ?? "Не удалось зарезервировать товар.");
      return;
    }
    const response = await fetch("/api/warehouse-work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать задание на сборку.");
    } else {
      delete allocationKeysRef.current[createForm.orderId];
      setMessage("Товар зарезервирован, задание на сборку создано.");
      await loadData();
    }
  }

  async function confirmPick(line: WorkLine) {
    const input = pickInputs[line.id] ?? {
      locationScan: line.sourceLocation.code,
      productScan: line.variant?.sku ?? line.product.sku,
      quantity: line.quantity - line.pickedQuantity
    };
    const idempotencyKey = pickKeysRef.current[line.id] ?? crypto.randomUUID();
    pickKeysRef.current[line.id] = idempotencyKey;
    const response = await fetch(`/api/warehouse-work/lines/${line.id}/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, idempotencyKey })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось подтвердить сборку.");
    } else {
      setMessage("Сборка подтверждена.");
      delete pickKeysRef.current[line.id];
      await loadData();
    }
  }

  function updatePickInput(line: WorkLine, patch: Partial<{ locationScan: string; productScan: string; quantity: number }>) {
    setPickInputs((current) => ({
      ...current,
      [line.id]: {
        locationScan: current[line.id]?.locationScan ?? line.sourceLocation.code,
        productScan: current[line.id]?.productScan ?? line.variant?.sku ?? line.product.sku,
        quantity: current[line.id]?.quantity ?? line.quantity - line.pickedQuantity,
        ...patch
      }
    }));
  }

  const selectedOrderProduct = products.find((product) => product.id === orderForm.productId);

  return (
    <div>
      <PageHeader
        title="Сборка заказов"
        description="Зарезервируйте товар по заказу, создайте задание и подтвердите ячейку, товар и количество."
      />
      <NoticeBanner kind="error" message={error} />
      <NoticeBanner kind="success" message={message} />

      <ScannerStepLayout
        title="Соберите заказ"
        instruction="Создайте заказ или выберите существующий. Перед сборкой система зарезервирует товар по ячейкам."
        scanHint="Сканируйте ячейку и товар из строки задания."
        resultHint="После подтверждения резерв снимется, а товар спишется из ячейки через складской сервис."
      >
      <form onSubmit={createOrder} className="mb-4 rounded-lg border border-border bg-panel p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Новый заказ для сборки</h2>
        <div className="grid gap-4 md:grid-cols-5">
          <Field label="Номер заказа">
            <input
              className={inputClass}
              value={orderForm.number}
              onChange={(event) => setOrderForm((current) => ({ ...current, number: event.target.value }))}
              placeholder="ORDER-1002"
              required
            />
          </Field>
          <Field label={commonText.product}>
            <select
              className={inputClass}
              value={orderForm.productId}
              onChange={(event) =>
                setOrderForm((current) => ({ ...current, productId: event.target.value, variantId: "" }))
              }
              required
            >
              <option value="">Выберите товар</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Вариант">
            <select
              className={inputClass}
              value={orderForm.variantId}
              onChange={(event) => setOrderForm((current) => ({ ...current, variantId: event.target.value }))}
            >
              <option value="">Основной товар</option>
              {selectedOrderProduct?.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.sku}
                </option>
              ))}
            </select>
          </Field>
          <QuantityStepper
            label={commonText.quantity}
            min={1}
            value={orderForm.quantity}
            onChange={(quantity) => setOrderForm((current) => ({ ...current, quantity }))}
          />
          <div className="flex items-end">
            <button className={secondaryButtonClass} type="submit" disabled={products.length === 0}>
              Создать заказ
            </button>
          </div>
        </div>
      </form>

      <form onSubmit={createPickWork} className="mb-6 rounded-lg border border-border bg-panel p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Задание на сборку</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Заказ">
            <select
              className={inputClass}
              value={createForm.orderId}
              onChange={(event) => setCreateForm((current) => ({ ...current, orderId: event.target.value }))}
              required
            >
              <option value="">Выберите заказ</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.number} ({labelFor(statusLabels, order.status)})
                </option>
              ))}
            </select>
          </Field>
          <Field label={commonText.warehouse}>
            <select
              className={inputClass}
              value={createForm.warehouseId}
              onChange={(event) => setCreateForm((current) => ({ ...current, warehouseId: event.target.value }))}
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
          <div className="flex items-end">
            <button className={buttonClass} type="submit">
              Зарезервировать и создать
            </button>
          </div>
        </div>
      </form>
      </ScannerStepLayout>

      {work.length === 0 ? <EmptyState title="Нет заданий для сборки" body="Создайте задание по заказу, когда товар есть в ячейках сборки." /> : null}
      <div className="space-y-4">
        {work.map((item) => (
          <section key={item.id} className="rounded-lg border border-border bg-panel p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-semibold">{item.sourceOrder?.number ?? item.id.slice(0, 8)}</div>
                <div className="text-sm text-muted">{item.warehouse.code}</div>
              </div>
              <StatusBadge value={item.status} />
            </div>
            <div className="space-y-3">
              {item.lines.map((line) => {
                const remaining = line.quantity - line.pickedQuantity;
                const input = pickInputs[line.id];
                return (
                  <div key={line.id} className="rounded-md border border-border p-3">
                    <div className="mb-3 grid gap-2 md:grid-cols-4">
                      <div>
                        <div className="text-xs text-muted">Ячейка</div>
                        <div className="font-medium">{line.sourceLocation.code}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">Товар</div>
                        <div className="font-medium">{line.product.sku}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">Собрано</div>
                        <div className="font-medium">
                          {line.pickedQuantity} / {line.quantity}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={line.status} />
                        {line.exceptionReason ? <StatusBadge value={line.exceptionReason} /> : null}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Field label="Скан ячейки">
                        <input
                          className={inputClass}
                          value={input?.locationScan ?? line.sourceLocation.code}
                          onChange={(event) => updatePickInput(line, { locationScan: event.target.value })}
                          disabled={line.status === "COMPLETED"}
                        />
                      </Field>
                      <Field label="Скан товара">
                        <input
                          className={inputClass}
                          value={input?.productScan ?? line.variant?.sku ?? line.product.sku}
                          onChange={(event) => updatePickInput(line, { productScan: event.target.value })}
                          disabled={line.status === "COMPLETED"}
                        />
                      </Field>
                      <QuantityStepper
                        label="Количество"
                        min={1}
                        max={remaining}
                        value={input?.quantity ?? remaining}
                        disabled={line.status === "COMPLETED"}
                        onChange={(quantity) => updatePickInput(line, { quantity })}
                      />
                      <div className="flex items-end">
                        <button
                          className={secondaryButtonClass}
                          disabled={line.status === "COMPLETED"}
                          type="button"
                          onClick={() => void confirmPick(line)}
                        >
                          Подтвердить
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
