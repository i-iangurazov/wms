"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { cardClass, inputClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Select } from "@/components/ui";
import { commonText, emptyStates, labelFor, locationTypeLabels } from "@/lib/wmsText";

type Balance = {
  id: string;
  quantity: number;
  onHandQty: number;
  reservedQty: number;
  pickedQty: number;
  damagedQty: number;
  blockedQty: number;
  availableQty: number;
  unavailableQty: number;
  warehouse: { code: string; name: string };
  location: { code: string; type: string };
  product: { sku: string; name: string };
  variant: { sku: string; name: string } | null;
};

export default function InventoryPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredBalances = useMemo(() => {
    const query = search.trim().toLowerCase();
    return balances.filter((balance) => {
      const matchesQuery =
        !query ||
        balance.warehouse.code.toLowerCase().includes(query) ||
        balance.location.code.toLowerCase().includes(query) ||
        balance.product.sku.toLowerCase().includes(query) ||
        balance.product.name.toLowerCase().includes(query) ||
        balance.variant?.sku.toLowerCase().includes(query);
      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "AVAILABLE" && balance.availableQty > 0) ||
        (stockFilter === "UNAVAILABLE" && balance.unavailableQty > 0);
      return matchesQuery && matchesStock;
    });
  }, [balances, search, stockFilter]);

  const columns = useMemo<ColumnDef<Balance, unknown>[]>(
    () => [
      {
        id: "warehouse",
        header: commonText.warehouse,
        cell: ({ row }) => row.original.warehouse.code,
        meta: { minWidth: "120px" }
      },
      {
        id: "location",
        header: commonText.location,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.location.code}</div>
            <div className="mt-1 text-xs text-muted">{labelFor(locationTypeLabels, row.original.location.type)}</div>
          </div>
        ),
        meta: { minWidth: "150px" }
      },
      {
        id: "product",
        header: commonText.product,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.product.sku}</div>
            <div className="mt-1 max-w-xs text-xs leading-5 text-muted">{row.original.product.name}</div>
          </div>
        ),
        meta: { minWidth: "220px" }
      },
      {
        id: "variant",
        header: "Вариант",
        cell: ({ row }) => row.original.variant?.sku ?? commonText.baseProduct,
        meta: { minWidth: "140px" }
      },
      {
        id: "onHand",
        header: "В наличии",
        cell: ({ row }) => <span className="font-semibold tabular-nums">{row.original.onHandQty}</span>,
        meta: { align: "right", minWidth: "110px" }
      },
      {
        id: "available",
        header: "Доступно",
        cell: ({ row }) => <span className="font-semibold tabular-nums text-emerald-700">{row.original.availableQty}</span>,
        meta: { align: "right", minWidth: "110px" }
      },
      {
        id: "unavailable",
        header: "Недоступно",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold tabular-nums text-muted">{row.original.unavailableQty}</div>
            {row.original.unavailableQty > 0 ? (
              <div className="mt-1 text-xs leading-5 text-muted">
                Резерв: {row.original.reservedQty} · Собрано: {row.original.pickedQty} · Повреждено:{" "}
                {row.original.damagedQty} · Блок: {row.original.blockedQty}
              </div>
            ) : null}
          </div>
        ),
        meta: { align: "right", minWidth: "230px" }
      }
    ],
    []
  );

  useEffect(() => {
    async function loadBalances() {
      const response = await fetch("/api/inventory/balances", { cache: "no-store" });
      const payload = (await response.json()) as { balances?: Balance[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить остатки.");
      } else {
        setBalances(payload.balances ?? []);
      }
      setLoading(false);
    }
    void loadBalances();
  }, []);

  return (
    <div>
      <PageHeader
        title="Остатки"
        description="Фактический товар по складам, ячейкам и SKU."
      />
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {loading ? <LoadingState message="Загрузка остатков..." /> : null}
      {balances.length > 0 ? (
        <div className={`${cardClass} mb-4 grid gap-3 md:grid-cols-[1fr_220px]`}>
          <input
            className={inputClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по товару, SKU, складу или ячейке"
          />
          <Select
            value={stockFilter}
            onValueChange={setStockFilter}
            options={[
              { value: "ALL", label: "Все остатки" },
              { value: "AVAILABLE", label: "Есть доступный товар" },
              { value: "UNAVAILABLE", label: "Есть недоступный товар" }
            ]}
          />
        </div>
      ) : null}
      {!loading && balances.length === 0 ? (
        <EmptyState title={emptyStates.balancesTitle} body={emptyStates.balancesBody} />
      ) : null}
      {!loading && balances.length > 0 && filteredBalances.length === 0 ? (
        <EmptyState title="Остатки не найдены" body="Попробуйте изменить поиск или фильтр." />
      ) : null}
      {filteredBalances.length > 0 ? (
        <DataTable data={filteredBalances} columns={columns} getRowId={(row) => row.id} />
      ) : null}
    </div>
  );
}
