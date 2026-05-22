"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { cardClass, tableWrapClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";

type StockState = {
  onHandQty: number;
  reservedQty: number;
  pickedQty: number;
  damagedQty: number;
  blockedQty: number;
};

type Discrepancy = {
  id: string;
  warehouse: { code: string };
  location: { code: string };
  product: { sku: string; name: string };
  variant: { sku: string; name: string } | null;
  actual: StockState;
  expected: StockState;
};

type Reconciliation = {
  checkedBalances: number;
  checkedMovements: number;
  ledgerOnlyKeys: number;
  discrepancies: Discrepancy[];
};

function stateSummary(state: StockState) {
  return `Факт ${state.onHandQty}, резерв ${state.reservedQty}, собрано ${state.pickedQty}, повреждено ${state.damagedQty}, блок ${state.blockedQty}`;
}

export default function ReconciliationPage() {
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReconciliation() {
      const response = await fetch("/api/inventory/reconciliation", { cache: "no-store" });
      const payload = (await response.json()) as { reconciliation?: Reconciliation; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Не удалось проверить остатки.");
        return;
      }
      setReconciliation(payload.reconciliation ?? null);
    }
    void loadReconciliation();
  }, []);

  return (
    <div>
      <PageHeader
        title="Проверка остатков"
        description="Сравнение текущих остатков с суммой складских движений."
      />
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {!reconciliation && !error ? <LoadingState message="Проверяем остатки..." /> : null}
      {reconciliation ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="Проверено остатков" value={reconciliation.checkedBalances} />
            <Metric label="Проверено движений" value={reconciliation.checkedMovements} />
            <Metric label="Расхождений" value={reconciliation.discrepancies.length + reconciliation.ledgerOnlyKeys} />
          </div>
          {reconciliation.discrepancies.length === 0 && reconciliation.ledgerOnlyKeys === 0 ? (
            <EmptyState title="Расхождений нет" body="Остатки совпадают с историей движений." />
          ) : null}
          {reconciliation.ledgerOnlyKeys > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Есть движения без соответствующей строки остатка: {reconciliation.ledgerOnlyKeys}. Проверьте историю
              движений.
            </div>
          ) : null}
          {reconciliation.discrepancies.length > 0 ? (
            <div className={tableWrapClass}>
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-surface text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Склад / ячейка</th>
                    <th className="px-4 py-3">Товар</th>
                    <th className="px-4 py-3">В остатках</th>
                    <th className="px-4 py-3">По движениям</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.discrepancies.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {row.warehouse.code} / {row.location.code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.product.sku}</div>
                        <div className="text-xs text-muted">{row.variant?.sku ?? row.product.name}</div>
                      </td>
                      <td className="px-4 py-3">{stateSummary(row.actual)}</td>
                      <td className="px-4 py-3">{stateSummary(row.expected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={cardClass}>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
