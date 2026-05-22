"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { cardClass, inputClass, tableWrapClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
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
          <select className={inputClass} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="ALL">Все операции</option>
            {Object.entries(movementTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {!loading && movements.length === 0 ? (
        <EmptyState title={emptyStates.movementsTitle} body={emptyStates.movementsBody} />
      ) : null}
      {!loading && movements.length > 0 && filteredMovements.length === 0 ? (
        <EmptyState title="Движения не найдены" body="Попробуйте изменить поиск или тип операции." />
      ) : null}
      {filteredMovements.length > 0 ? (
        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Время</th>
                <th className="px-4 py-3">{commonText.type}</th>
                <th className="px-4 py-3">{commonText.product}</th>
                <th className="px-4 py-3">Откуда</th>
                <th className="px-4 py-3">Куда</th>
                <th className="px-4 py-3 text-right">Кол-во</th>
                <th className="px-4 py-3">Сотрудник</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="border-t border-border">
                  <td className="px-4 py-3">{new Date(movement.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{labelFor(movementTypeLabels, movement.type)}</div>
                    {movement.reason ? (
                      <div className="text-xs text-muted">{labelFor(adjustmentReasonLabels, movement.reason)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{movement.product.sku}</div>
                    <div className="text-xs text-muted">{movement.variant?.sku ?? movement.product.name}</div>
                  </td>
                  <td className="px-4 py-3">{movement.fromLocation?.code ?? "-"}</td>
                  <td className="px-4 py-3">{movement.toLocation?.code ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{movement.quantity}</td>
                  <td className="px-4 py-3">{movement.createdBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
