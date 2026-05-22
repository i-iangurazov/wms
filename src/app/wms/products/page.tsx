"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, dangerButtonClass, Field, inputClass, secondaryButtonClass, tableWrapClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { Select } from "@/components/ui";
import { NoticeBanner } from "@/components/wms/NoticeBanner";
import { commonText, emptyStates } from "@/lib/wmsText";

type Variant = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  variants: Variant[];
};

type ProductForm = {
  id?: string;
  sku: string;
  name: string;
  barcode: string;
};

type VariantForm = ProductForm & {
  productId: string;
};

const emptyProductForm: ProductForm = { sku: "", name: "", barcode: "" };
const emptyVariantForm: VariantForm = { productId: "", sku: "", name: "", barcode: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariantForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return products;
    }
    return products.filter(
      (product) =>
        product.sku.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.variants.some(
          (variant) =>
            variant.sku.toLowerCase().includes(query) ||
            variant.name.toLowerCase().includes(query) ||
            variant.barcode?.toLowerCase().includes(query)
        )
    );
  }, [products, search]);

  async function loadProducts() {
    const response = await fetch("/api/products", { cache: "no-store" });
    const payload = (await response.json()) as { products?: Product[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить товары.");
    } else {
      const nextProducts = payload.products ?? [];
      setProducts(nextProducts);
      setVariantForm((current) => ({ ...current, productId: current.productId || nextProducts[0]?.id || "" }));
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch(productForm.id ? `/api/products/${productForm.id}` : "/api/products", {
      method: productForm.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productForm)
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить товар.");
      return;
    }
    setMessage(productForm.id ? "Товар обновлён." : "Товар создан.");
    setProductForm(emptyProductForm);
    await loadProducts();
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch(
      variantForm.id ? `/api/product-variants/${variantForm.id}` : `/api/products/${variantForm.productId}/variants`,
      {
        method: variantForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variantForm)
      }
    );
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить вариант.");
      return;
    }
    setMessage(variantForm.id ? "Вариант обновлён." : "Вариант создан.");
    setVariantForm((current) => ({ ...emptyVariantForm, productId: current.productId }));
    await loadProducts();
  }

  async function deactivate(url: string, successMessage: string) {
    setError(null);
    setMessage(null);
    const response = await fetch(url, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сделать запись недоступной.");
      return;
    }
    setMessage(successMessage);
    await loadProducts();
  }

  async function importProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setImportErrors([]);
    if (!importFile) {
      setError("Выберите CSV-файл.");
      return;
    }
    const csv = await importFile.text();
    const response = await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv })
    });
    const payload = (await response.json()) as {
      imported?: number;
      productsCreated?: number;
      variantsCreated?: number;
      errors?: Array<{ row: number; message: string }>;
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Не удалось импортировать товары.");
      return;
    }
    if (payload.errors && payload.errors.length > 0) {
      setImportErrors(payload.errors);
      setError("Исправьте ошибки в файле и загрузите его снова.");
      return;
    }
    setImportFile(null);
    setMessage(`Импортировано: товаров ${payload.productsCreated ?? 0}, вариантов ${payload.variantsCreated ?? 0}.`);
    await loadProducts();
  }

  return (
    <div>
      <PageHeader
        title="Товары"
        description="Создавайте товары, варианты и штрихкоды для приёмки, размещения и сборки."
      />
      <NoticeBanner kind="error" message={error} />
      <NoticeBanner kind="success" message={message} />

      <form onSubmit={importProducts} className={`${cardClass} mb-6`}>
        <div className="mb-3">
          <h2 className="text-base font-semibold">Импорт из CSV</h2>
          <p className="text-sm text-muted">
            Колонки: sku, name, barcode, barcodes, variant_sku, variant_name, variant_barcode, variant_barcodes.
            Дополнительные штрихкоды разделяйте точкой с запятой.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="CSV-файл">
            <input
              className={inputClass}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <button className={buttonClass} type="submit" disabled={!importFile}>
            Импортировать
          </button>
        </div>
        {importErrors.length > 0 ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="font-semibold">Ошибки импорта</div>
            <ul className="mt-2 space-y-1">
              {importErrors.slice(0, 8).map((item) => (
                <li key={`${item.row}-${item.message}`}>
                  Строка {item.row}: {item.message}
                </li>
              ))}
            </ul>
            {importErrors.length > 8 ? <div className="mt-2">Показаны первые 8 ошибок.</div> : null}
          </div>
        ) : null}
      </form>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <form onSubmit={saveProduct} className={cardClass}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{productForm.id ? "Изменить товар" : "Новый товар"}</h2>
              <p className="text-sm text-muted">SKU и штрихкод должны быть уникальными для сканирования.</p>
            </div>
            {productForm.id ? (
              <button className={secondaryButtonClass} type="button" onClick={() => setProductForm(emptyProductForm)}>
                {commonText.cancel}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="SKU">
              <input
                className={inputClass}
                value={productForm.sku}
                onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))}
                placeholder="SKU-001"
                required
              />
            </Field>
            <Field label={commonText.name}>
              <input
                className={inputClass}
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Название товара"
                required
              />
            </Field>
            <Field label={commonText.barcode}>
              <input
                className={inputClass}
                value={productForm.barcode}
                onChange={(event) => setProductForm((current) => ({ ...current, barcode: event.target.value }))}
                placeholder="Опционально"
              />
            </Field>
          </div>
          <div className="mt-4">
            <button className={buttonClass} type="submit">
              {productForm.id ? commonText.save : "Создать товар"}
            </button>
          </div>
        </form>

        <form onSubmit={saveVariant} className={cardClass}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{variantForm.id ? "Изменить вариант" : "Новый вариант"}</h2>
              <p className="text-sm text-muted">Варианты нужны, если размер, цвет или упаковка имеют свой SKU.</p>
            </div>
            {variantForm.id ? (
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={() => setVariantForm((current) => ({ ...emptyVariantForm, productId: current.productId }))}
              >
                {commonText.cancel}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Field label={commonText.product}>
              <Select
                value={variantForm.productId}
                onValueChange={(productId) => setVariantForm((current) => ({ ...current, productId }))}
                placeholder="Выберите товар"
                options={products.map((product) => ({ value: product.id, label: product.sku }))}
              />
            </Field>
            <Field label="SKU">
              <input
                className={inputClass}
                value={variantForm.sku}
                onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value }))}
                placeholder="SKU-001-BLUE"
                required
              />
            </Field>
            <Field label={commonText.name}>
              <input
                className={inputClass}
                value={variantForm.name}
                onChange={(event) => setVariantForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Синий"
                required
              />
            </Field>
            <Field label={commonText.barcode}>
              <input
                className={inputClass}
                value={variantForm.barcode}
                onChange={(event) => setVariantForm((current) => ({ ...current, barcode: event.target.value }))}
                placeholder="Опционально"
              />
            </Field>
          </div>
          <div className="mt-4">
            <button className={buttonClass} type="submit" disabled={products.length === 0}>
              {variantForm.id ? commonText.save : "Создать вариант"}
            </button>
          </div>
        </form>
      </div>

      {products.length > 0 ? (
        <div className={`${cardClass} mb-4`}>
          <input
            className={inputClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по SKU, названию или штрихкоду"
          />
        </div>
      ) : null}

      {loading ? <LoadingState message="Загрузка товаров..." /> : null}
      {!loading && products.length === 0 ? (
        <EmptyState title={emptyStates.productsTitle} body={emptyStates.productsBody} />
      ) : null}
      {!loading && products.length > 0 && filteredProducts.length === 0 ? (
        <EmptyState title="Товары не найдены" body="Попробуйте изменить строку поиска." />
      ) : null}

      {filteredProducts.length > 0 ? (
        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">{commonText.name}</th>
                <th className="px-4 py-3">{commonText.barcode}</th>
                <th className="px-4 py-3">Варианты</th>
                <th className="px-4 py-3 text-right">{commonText.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 font-semibold">{product.sku}</td>
                  <td className="px-4 py-3">{product.name}</td>
                  <td className="px-4 py-3">{product.barcode ?? commonText.none}</td>
                  <td className="px-4 py-3">
                    {product.variants.length === 0 ? (
                      <span className="text-muted">Нет вариантов</span>
                    ) : (
                      <div className="space-y-2">
                        {product.variants.map((variant) => (
                          <div key={variant.id} className="rounded-md bg-surface p-2">
                            <div className="font-medium">{variant.sku}</div>
                            <div className="text-xs text-muted">
                              {variant.name} · {variant.barcode ?? "без штрихкода"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                className={dangerButtonClass}
                                type="button"
                                onClick={() =>
                                  setVariantForm({
                                    id: variant.id,
                                    productId: product.id,
                                    sku: variant.sku,
                                    name: variant.name,
                                    barcode: variant.barcode ?? ""
                                  })
                                }
                              >
                                {commonText.edit}
                              </button>
                              <button
                                className={secondaryButtonClass}
                                type="button"
                                onClick={() =>
                                  void deactivate(`/api/product-variants/${variant.id}`, "Вариант сделан недоступным.")
                                }
                              >
                                {commonText.deactivate}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        className={dangerButtonClass}
                        type="button"
                        onClick={() =>
                          setProductForm({
                            id: product.id,
                            sku: product.sku,
                            name: product.name,
                            barcode: product.barcode ?? ""
                          })
                        }
                      >
                        {commonText.edit}
                      </button>
                      <button
                        className={secondaryButtonClass}
                        type="button"
                        onClick={() => void deactivate(`/api/products/${product.id}`, "Товар сделан недоступным.")}
                      >
                        {commonText.deactivate}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
