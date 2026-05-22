"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { cardClass, inputClass, tableWrapClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { Select } from "@/components/ui";
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
        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">{commonText.warehouse}</th>
                <th className="px-4 py-3">{commonText.location}</th>
                <th className="px-4 py-3">{commonText.product}</th>
                <th className="px-4 py-3">Вариант</th>
                <th className="px-4 py-3 text-right">В наличии</th>
                <th className="px-4 py-3 text-right">Доступно</th>
                <th className="px-4 py-3 text-right">Недоступно</th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.map((balance) => (
                <tr key={balance.id} className="border-t border-border">
                  <td className="px-4 py-3">{balance.warehouse.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{balance.location.code}</div>
                    <div className="text-xs text-muted">{labelFor(locationTypeLabels, balance.location.type)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{balance.product.sku}</div>
                    <div className="text-xs text-muted">{balance.product.name}</div>
                  </td>
                  <td className="px-4 py-3">{balance.variant?.sku ?? commonText.baseProduct}</td>
                  <td className="px-4 py-3 text-right font-semibold">{balance.onHandQty}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">{balance.availableQty}</td>
                  <td className="px-4 py-3 text-right text-muted">
                    <div className="font-semibold">{balance.unavailableQty}</div>
                    {balance.unavailableQty > 0 ? (
                      <div className="text-xs">
                        Резерв: {balance.reservedQty} · Собрано: {balance.pickedQty} · Повреждено: {balance.damagedQty} ·
                        Блок: {balance.blockedQty}
                      </div>
                    ) : null}
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
