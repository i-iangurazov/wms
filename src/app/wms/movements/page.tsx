"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { cardClass, inputClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Select } from "@/components/ui";
import {
  commonText,
  emptyStates,
  labelFor,
  movementTypeLabels,
  adjustmentReasonLabels
} from "@/lib/wmsText";

type Movement = {
  id: string;
  type: string;
  reason: string | null;
  quantity: number;
  note: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  warehouse: { code: string } | null;
  fromLocation: { code: string } | null;
  toLocation: { code: string } | null;
  product: { sku: string; name: string };
  variant: { sku: string; name: string } | null;
  createdBy: { name: string };
};

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesType = typeFilter === "ALL" || movement.type === typeFilter;
      const matchesQuery =
        !query ||
        movement.product.sku.toLowerCase().includes(query) ||
        movement.product.name.toLowerCase().includes(query) ||
        movement.variant?.sku.toLowerCase().includes(query) ||
        movement.fromLocation?.code.toLowerCase().includes(query) ||
        movement.toLocation?.code.toLowerCase().includes(query) ||
        movement.createdBy.name.toLowerCase().includes(query);
      return matchesType && matchesQuery;
    });
  }, [movements, search, typeFilter]);

  const columns = useMemo<ColumnDef<Movement, unknown>[]>(
    () => [
      {
        id: "createdAt",
        header: "Время",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
        meta: { minWidth: "180px" }
      },
      {
        id: "type",
        header: commonText.type,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{labelFor(movementTypeLabels, row.original.type)}</div>
            {row.original.reason ? (
              <div className="mt-1 text-xs text-muted">{labelFor(adjustmentReasonLabels, row.original.reason)}</div>
            ) : null}
          </div>
        ),
        meta: { minWidth: "180px" }
      },
      {
        id: "product",
        header: commonText.product,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.product.sku}</div>
            <div className="mt-1 max-w-xs text-xs leading-5 text-muted">
              {row.original.variant?.sku ?? row.original.product.name}
            </div>
          </div>
        ),
        meta: { minWidth: "220px" }
      },
      {
        id: "from",
        header: "Откуда",
        cell: ({ row }) => row.original.fromLocation?.code ?? "-",
        meta: { minWidth: "120px" }
      },
      {
        id: "to",
        header: "Куда",
        cell: ({ row }) => row.original.toLocation?.code ?? "-",
        meta: { minWidth: "120px" }
      },
      {
        id: "quantity",
        header: "Кол-во",
        cell: ({ row }) => <span className="font-semibold tabular-nums">{row.original.quantity}</span>,
        meta: { align: "right", minWidth: "100px" }
      },
      {
        id: "createdBy",
        header: "Сотрудник",
        cell: ({ row }) => row.original.createdBy.name,
        meta: { minWidth: "160px" }
      }
    ],
    []
  );

  useEffect(() => {
    async function loadMovements() {
      const response = await fetch("/api/inventory/movements", { cache: "no-store" });
      const payload = (await response.json()) as { movements?: Movement[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить историю движений.");
      } else {
        setMovements(payload.movements ?? []);
      }
      setLoading(false);
    }
    void loadMovements();
  }, []);

  return (
    <div>
      <PageHeader
        title="История движений"
        description="Неизменяемая история всех операций с остатками."
      />
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {loading ? <LoadingState message="Загрузка движений..." /> : null}
      {movements.length > 0 ? (
        <div className={`${cardClass} mb-4 grid gap-3 md:grid-cols-[1fr_220px]`}>
          <input
            className={inputClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по товару, ячейке или сотруднику"
          />
          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
            options={[
              { value: "ALL", label: "Все операции" },
              ...Object.entries(movementTypeLabels).map(([type, label]) => ({ value: type, label }))
            ]}
          />
        </div>
      ) : null}
      {!loading && movements.length === 0 ? (
        <EmptyState title={emptyStates.movementsTitle} body={emptyStates.movementsBody} />
      ) : null}
      {!loading && movements.length > 0 && filteredMovements.length === 0 ? (
        <EmptyState title="Движения не найдены" body="Попробуйте изменить поиск или тип операции." />
      ) : null}
      {filteredMovements.length > 0 ? (
        <DataTable data={filteredMovements} columns={columns} getRowId={(row) => row.id} />
      ) : null}
    </div>
  );
}
