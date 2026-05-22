"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { ActionMenu, DataTable, Select } from "@/components/ui";
import { NoticeBanner } from "@/components/wms/NoticeBanner";
import { fetchJson } from "@/lib/apiClient";
import { commonText, emptyStates } from "@/lib/wmsText";
import {
  productInputSchema,
  productVariantInputSchema,
  type ProductInput,
  type ProductVariantInput
} from "@/lib/wmsSchemas";

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

type ImportError = { row: number; message: string };
type ImportPreview = {
  csv: string;
  rows: number;
  columns: string[];
  errors: ImportError[];
};

const emptyProductForm: ProductInput = { sku: "", name: "", barcode: "" };
const emptyVariantForm: ProductVariantInput = { productId: "", sku: "", name: "", barcode: "" };
const requiredImportColumns = ["sku", "name"];

function previewFromRows(rows: Record<string, unknown>[], csv: string): ImportPreview {
  const columns = Object.keys(rows[0] ?? {});
  const normalizedColumns = columns.map((column) => column.trim().toLowerCase());
  const errors = requiredImportColumns
    .filter((column) => !normalizedColumns.includes(column))
    .map((column) => ({ row: 1, message: `Нет колонки ${column}.` }));
  return { csv, rows: rows.length, columns, errors };
}

async function readProductImportFile(file: File): Promise<ImportPreview> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx" || extension === "xls") {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { csv: "", rows: 0, columns: [], errors: [{ row: 1, message: "В файле нет листов." }] };
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" });
    return previewFromRows(rows, Papa.unparse(rows));
  }

  const csv = await file.text();
  const parsed = Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: true });
  const parseErrors = parsed.errors.map((error) => ({
    row: (error.row ?? 0) + 2,
    message: error.message
  }));
  const preview = previewFromRows(parsed.data, csv);
  return { ...preview, errors: [...parseErrors, ...preview.errors] };
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const productForm = useForm<ProductInput>({
    resolver: zodResolver(productInputSchema),
    defaultValues: emptyProductForm
  });
  const variantForm = useForm<ProductVariantInput>({
    resolver: zodResolver(productVariantInputSchema),
    defaultValues: emptyVariantForm
  });
  const selectedVariantProductId = variantForm.watch("productId");
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchJson<{ products: Product[] }>("/api/products", { cache: "no-store" })
  });
  const rawProducts = productsQuery.data?.products;
  const products = useMemo(() => rawProducts ?? [], [rawProducts]);

  useEffect(() => {
    if (!selectedVariantProductId && products[0]?.id) {
      variantForm.setValue("productId", products[0].id, { shouldValidate: true });
    }
  }, [products, selectedVariantProductId, variantForm]);

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

  const productMutation = useMutation({
    mutationFn: (values: ProductInput) =>
      fetchJson<{ product: Product }>(editingProductId ? `/api/products/${editingProductId}` : "/api/products", {
        method: editingProductId ? "PUT" : "POST",
        body: JSON.stringify(values)
      }),
    onSuccess: async (_payload, values) => {
      toast.success(editingProductId ? "Товар обновлён." : "Товар создан.");
      setSearch(values.sku);
      setEditingProductId(null);
      productForm.reset(emptyProductForm);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Не удалось сохранить товар.")
  });

  const variantMutation = useMutation({
    mutationFn: (values: ProductVariantInput) =>
      fetchJson<{ variant: Variant }>(
        editingVariantId ? `/api/product-variants/${editingVariantId}` : `/api/products/${values.productId}/variants`,
        {
          method: editingVariantId ? "PUT" : "POST",
          body: JSON.stringify(values)
        }
      ),
    onSuccess: async () => {
      toast.success(editingVariantId ? "Вариант обновлён." : "Вариант создан.");
      setEditingVariantId(null);
      variantForm.reset({ ...emptyVariantForm, productId: variantForm.getValues("productId") });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Не удалось сохранить вариант.")
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ url }: { url: string; successMessage: string }) => fetchJson(url, { method: "DELETE" }),
    onSuccess: async (_payload, variables) => {
      toast.success(variables.successMessage);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Не удалось сделать запись недоступной.")
  });

  const importMutation = useMutation({
    mutationFn: (csv: string) =>
      fetchJson<{
        imported?: number;
        productsCreated?: number;
        variantsCreated?: number;
        errors?: ImportError[];
      }>("/api/products/import", {
        method: "POST",
        body: JSON.stringify({ csv })
      }),
    onSuccess: async (payload) => {
      if (payload.errors && payload.errors.length > 0) {
        setImportErrors(payload.errors);
        toast.error("Исправьте ошибки в файле и загрузите его снова.");
        return;
      }
      setImportFile(null);
      setImportPreview(null);
      setImportErrors([]);
      toast.success(`Импортировано: товаров ${payload.productsCreated ?? 0}, вариантов ${payload.variantsCreated ?? 0}.`);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Не удалось импортировать товары.")
  });

  async function handleImportFile(file: File | null) {
    setImportFile(file);
    setImportPreview(null);
    setImportErrors([]);
    if (!file) {
      return;
    }
    const preview = await readProductImportFile(file);
    setImportPreview(preview);
    setImportErrors(preview.errors);
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    productForm.reset({ sku: product.sku, name: product.name, barcode: product.barcode ?? "" });
  }

  function editVariant(product: Product, variant: Variant) {
    setEditingVariantId(variant.id);
    variantForm.reset({
      productId: product.id,
      sku: variant.sku,
      name: variant.name,
      barcode: variant.barcode ?? ""
    });
  }

  const columns: ColumnDef<Product, unknown>[] = [
    {
      id: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-semibold">{row.original.sku}</span>,
      meta: { minWidth: "150px", sortValue: (row) => row.sku }
    },
    {
      id: "name",
      header: commonText.name,
      cell: ({ row }) => row.original.name,
      meta: { minWidth: "220px", sortValue: (row) => row.name }
    },
    {
      id: "barcode",
      header: commonText.barcode,
      cell: ({ row }) => row.original.barcode ?? commonText.none,
      meta: { minWidth: "170px", sortValue: (row) => row.barcode ?? "" }
    },
    {
      id: "variants",
      header: "Варианты",
      cell: ({ row }) =>
        row.original.variants.length === 0 ? (
          <span className="text-muted">Нет вариантов</span>
        ) : (
          <div className="space-y-2">
            {row.original.variants.map((variant) => (
              <div key={variant.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{variant.sku}</div>
                    <div className="mt-1 text-xs leading-5 text-muted">
                      {variant.name} · {variant.barcode ?? "без штрихкода"}
                    </div>
                  </div>
                  <ActionMenu
                    items={[
                      { label: commonText.edit, onSelect: () => editVariant(row.original, variant) },
                      {
                        label: commonText.deactivate,
                        danger: true,
                        onSelect: () =>
                          deactivateMutation.mutate({
                            url: `/api/product-variants/${variant.id}`,
                            successMessage: "Вариант сделан недоступным."
                          })
                      }
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        ),
      meta: { minWidth: "300px" }
    },
    {
      id: "actions",
      header: commonText.actions,
      cell: ({ row }) => (
        <ActionMenu
          items={[
            { label: commonText.edit, onSelect: () => editProduct(row.original) },
            {
              label: commonText.deactivate,
              danger: true,
              onSelect: () =>
                deactivateMutation.mutate({
                  url: `/api/products/${row.original.id}`,
                  successMessage: "Товар сделан недоступным."
                })
            }
          ]}
        />
      ),
      meta: { align: "right", minWidth: "210px" }
    }
  ];

  return (
    <div>
      <PageHeader
        title="Товары"
        description="Создавайте товары, варианты и штрихкоды для приёмки, размещения и сборки."
      />
      <NoticeBanner
        kind="error"
        message={productsQuery.error instanceof Error ? productsQuery.error.message : null}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!importPreview || importPreview.errors.length > 0) {
            toast.error(importPreview ? "Исправьте ошибки перед импортом." : "Выберите CSV или XLSX-файл.");
            return;
          }
          importMutation.mutate(importPreview.csv);
        }}
        className={`${cardClass} mb-6`}
      >
        <div className="mb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-base font-semibold">Импорт товаров</h2>
            <a className={secondaryButtonClass} href="/api/products/import/template">
              Скачать шаблон XLSX
            </a>
          </div>
          <p className="text-sm text-muted">
            Поддерживаются CSV и XLSX. Колонки: sku, name, barcode, barcodes, variant_sku, variant_name,
            variant_barcode, variant_barcodes.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Файл импорта">
            <input
              className={inputClass}
              type="file"
              accept=".csv,text/csv,.xlsx,.xls"
              onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <button
            className={buttonClass}
            type="submit"
            disabled={!importFile || !importPreview || importPreview.errors.length > 0 || importMutation.isPending}
          >
            Импортировать
          </button>
        </div>
        {importPreview ? (
          <div className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm">
            <div className="font-semibold">Предпросмотр: {importPreview.rows} строк</div>
            <div className="mt-1 text-muted">Колонки: {importPreview.columns.join(", ") || "не найдены"}</div>
          </div>
        ) : null}
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
        <form onSubmit={productForm.handleSubmit((values) => productMutation.mutate(values))} className={cardClass}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{editingProductId ? "Изменить товар" : "Новый товар"}</h2>
              <p className="text-sm text-muted">SKU и штрихкод должны быть уникальными для сканирования.</p>
            </div>
            {editingProductId ? (
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  productForm.reset(emptyProductForm);
                }}
              >
                {commonText.cancel}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="SKU" error={productForm.formState.errors.sku?.message}>
              <input className={inputClass} {...productForm.register("sku")} placeholder="SKU-001" />
            </Field>
            <Field label={commonText.name} error={productForm.formState.errors.name?.message}>
              <input className={inputClass} {...productForm.register("name")} placeholder="Название товара" />
            </Field>
            <Field label={commonText.barcode} error={productForm.formState.errors.barcode?.message}>
              <input className={inputClass} {...productForm.register("barcode")} placeholder="Опционально" />
            </Field>
          </div>
          <div className="mt-4">
            <button className={buttonClass} disabled={productMutation.isPending} type="submit">
              {editingProductId ? commonText.save : "Создать товар"}
            </button>
          </div>
        </form>

        <form onSubmit={variantForm.handleSubmit((values) => variantMutation.mutate(values))} className={cardClass}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{editingVariantId ? "Изменить вариант" : "Новый вариант"}</h2>
              <p className="text-sm text-muted">Варианты нужны, если размер, цвет или упаковка имеют свой SKU.</p>
            </div>
            {editingVariantId ? (
              <button
                className={secondaryButtonClass}
                type="button"
                onClick={() => {
                  setEditingVariantId(null);
                  variantForm.reset({ ...emptyVariantForm, productId: variantForm.getValues("productId") });
                }}
              >
                {commonText.cancel}
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Field label={commonText.product} error={variantForm.formState.errors.productId?.message}>
              <Select
                value={variantForm.watch("productId")}
                onValueChange={(productId) => variantForm.setValue("productId", productId, { shouldValidate: true })}
                placeholder="Выберите товар"
                options={products.map((product) => ({ value: product.id, label: product.sku }))}
              />
            </Field>
            <Field label="SKU" error={variantForm.formState.errors.sku?.message}>
              <input className={inputClass} {...variantForm.register("sku")} placeholder="SKU-001-BLUE" />
            </Field>
            <Field label={commonText.name} error={variantForm.formState.errors.name?.message}>
              <input className={inputClass} {...variantForm.register("name")} placeholder="Синий" />
            </Field>
            <Field label={commonText.barcode} error={variantForm.formState.errors.barcode?.message}>
              <input className={inputClass} {...variantForm.register("barcode")} placeholder="Опционально" />
            </Field>
          </div>
          <div className="mt-4">
            <button className={buttonClass} type="submit" disabled={products.length === 0 || variantMutation.isPending}>
              {editingVariantId ? commonText.save : "Создать вариант"}
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

      {productsQuery.isLoading ? <LoadingState message="Загрузка товаров..." /> : null}
      {!productsQuery.isLoading && products.length === 0 ? (
        <EmptyState title={emptyStates.productsTitle} body={emptyStates.productsBody} />
      ) : null}
      {!productsQuery.isLoading && products.length > 0 && filteredProducts.length === 0 ? (
        <EmptyState title="Товары не найдены" body="Попробуйте изменить строку поиска." />
      ) : null}

      {filteredProducts.length > 0 ? (
        <DataTable data={filteredProducts} columns={columns} getRowId={(row) => row.id} pageSize={100} />
      ) : null}
    </div>
  );
}
