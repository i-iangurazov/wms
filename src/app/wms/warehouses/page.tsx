"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { buttonClass, cardClass, Field, inputClass, secondaryButtonClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ActionMenu, DataTable, Select } from "@/components/ui";
import { fetchJson } from "@/lib/apiClient";
import { commonText, emptyStates } from "@/lib/wmsText";
import { warehouseInputSchema, type WarehouseInput } from "@/lib/wmsSchemas";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  _count?: { locations: number };
};

const emptyForm: WarehouseInput = { code: "", name: "", status: "ACTIVE" };

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const form = useForm<WarehouseInput>({
    resolver: zodResolver(warehouseInputSchema),
    defaultValues: emptyForm
  });
  const status = form.watch("status");
  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => fetchJson<{ warehouses: Warehouse[] }>("/api/warehouses", { cache: "no-store" })
  });
  const warehouses = warehousesQuery.data?.warehouses ?? [];
  const editing = warehouses.find((warehouse) => warehouse.id === editingId);
  const saveMutation = useMutation({
    mutationFn: (values: WarehouseInput) =>
      fetchJson<{ warehouse: Warehouse }>(editingId ? `/api/warehouses/${editingId}` : "/api/warehouses", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(values)
      }),
    onSuccess: async () => {
      toast.success(editingId ? "Склад обновлён." : "Склад создан.");
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Не удалось сохранить склад.")
  });
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => fetchJson<{ warehouse: Warehouse }>(`/api/warehouses/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("Склад сделан недоступным.");
      await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Не удалось сделать склад недоступным.")
  });

  function startEdit(warehouse: Warehouse) {
    setEditingId(warehouse.id);
    form.reset({ code: warehouse.code, name: warehouse.name, status: warehouse.status });
  }

  function resetForm() {
    setEditingId(null);
    form.reset(emptyForm);
  }

  const columns: ColumnDef<Warehouse, unknown>[] = [
    {
      id: "code",
      header: commonText.code,
      cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      meta: { minWidth: "130px", sortValue: (row) => row.code }
    },
    {
      id: "name",
      header: commonText.name,
      cell: ({ row }) => row.original.name,
      meta: { minWidth: "220px", sortValue: (row) => row.name }
    },
    {
      id: "locations",
      header: "Ячейки",
      cell: ({ row }) => <span className="tabular-nums">{row.original._count?.locations ?? 0}</span>,
      meta: { minWidth: "100px", sortValue: (row) => row._count?.locations ?? 0 }
    },
    {
      id: "status",
      header: commonText.status,
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
      meta: { minWidth: "130px", sortValue: (row) => row.status }
    },
    {
      id: "actions",
      header: commonText.actions,
      cell: ({ row }) => (
        <ActionMenu
          items={[
            { label: commonText.edit, onSelect: () => startEdit(row.original) },
            {
              label: commonText.deactivate,
              danger: true,
              disabled: row.original.status === "INACTIVE",
              onSelect: () => deactivateMutation.mutate(row.original.id)
            }
          ]}
        />
      ),
      meta: { align: "right", minWidth: "240px" }
    }
  ];

  return (
    <div>
      <PageHeader
        title="Склады"
        description="Создавайте склады и управляйте их доступностью. История операций сохраняется."
      />

      <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className={`${cardClass} mb-6`}>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label={commonText.code}>
            <input
              className={inputClass}
              {...form.register("code")}
              placeholder="WH-1"
            />
            {form.formState.errors.code ? (
              <span className="mt-1.5 block text-xs font-medium text-danger">{form.formState.errors.code.message}</span>
            ) : null}
          </Field>
          <Field label={commonText.name}>
            <input
              className={inputClass}
              {...form.register("name")}
              placeholder="Основной склад"
            />
            {form.formState.errors.name ? (
              <span className="mt-1.5 block text-xs font-medium text-danger">{form.formState.errors.name.message}</span>
            ) : null}
          </Field>
          <Field label={commonText.status}>
            <Select
              value={status}
              onValueChange={(nextStatus) =>
                form.setValue("status", nextStatus as WarehouseInput["status"], { shouldValidate: true })
              }
              options={[
                { value: "ACTIVE", label: "Активно" },
                { value: "INACTIVE", label: "Недоступно" }
              ]}
            />
          </Field>
          <div className="flex items-end gap-2">
            <button className={buttonClass} disabled={saveMutation.isPending} type="submit">
              {editing ? commonText.update : commonText.create}
            </button>
            {editing ? (
              <button className={secondaryButtonClass} type="button" onClick={resetForm}>
                {commonText.cancel}
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {warehousesQuery.error ? (
        <div className="mb-4">
          <ErrorState message={warehousesQuery.error instanceof Error ? warehousesQuery.error.message : "Не удалось загрузить склады."} />
        </div>
      ) : null}
      {warehousesQuery.isLoading ? <LoadingState message="Загрузка складов..." /> : null}
      {!warehousesQuery.isLoading && warehouses.length === 0 ? (
        <EmptyState title={emptyStates.warehousesTitle} body={emptyStates.warehousesBody} />
      ) : null}

      {warehouses.length > 0 ? (
        <DataTable data={warehouses} columns={columns} getRowId={(row) => row.id} pageSize={100} />
      ) : null}
    </div>
  );
}
