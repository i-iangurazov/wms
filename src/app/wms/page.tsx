"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { emptyStates, labelFor, movementTypeLabels } from "@/lib/wmsText";

type Dashboard = {
  metrics: {
    activeWarehouses: number;
    activeLocations: number;
    totalUnits: number;
    pendingReceiving: number;
    pendingPutAway: number;
    pendingPicking: number;
    stockDiscrepancies: number;
  };
  recentMovements: {
    id: string;
    type: string;
    quantity: number;
    createdAt: string;
    product: { sku: string };
    fromLocation: { code: string } | null;
    toLocation: { code: string } | null;
  }[];
  pendingReceiving: {
    id: string;
    reference: string | null;
    warehouse: { code: string };
    receivingLocation: { code: string };
    _count: { lines: number };
  }[];
  pendingPutAway: {
    id: string;
    quantity: number;
    product: { sku: string };
    location: { code: string };
  }[];
  pendingPicking: {
    id: string;
    status: string;
    warehouse: { code: string };
    sourceOrder: { number: string } | null;
    _count: { lines: number };
  }[];
  stockDiscrepancies: {
    id: string;
    expectedQty: number;
    countedQty: number | null;
    difference: number;
    product: { sku: string };
    session: { warehouse: { code: string }; location: { code: string } };
  }[];
};

const metricLabels: Record<keyof Dashboard["metrics"], string> = {
  activeWarehouses: "Активные склады",
  activeLocations: "Активные ячейки",
  totalUnits: "Товара на складе",
  pendingReceiving: "Открытая приёмка",
  pendingPutAway: "Нужно разместить",
  pendingPicking: "Сборка заказов",
  stockDiscrepancies: "Расхождения"
};

export default function WmsDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const response = await fetch("/api/dashboard/wms", { cache: "no-store" });
      const payload = (await response.json()) as { dashboard?: Dashboard; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить обзор склада.");
      } else {
        setDashboard(payload.dashboard ?? null);
      }
    }
    void loadDashboard();
  }, []);

  return (
    <div>
      <PageHeader
        title="Обзор"
        description="Главное по складу: открытые задания, последние движения и расхождения по остаткам."
      />
      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</div> : null}
      {!dashboard ? <div className="text-sm text-muted">Загрузка обзора...</div> : null}
      {dashboard ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(dashboard.metrics) as (keyof Dashboard["metrics"])[]).map((key) => (
              <div key={key} className="rounded-lg border border-border bg-panel p-5 shadow-sm">
                <div className="text-sm font-medium text-muted">{metricLabels[key]}</div>
                <div className="mt-2 text-2xl font-semibold">{dashboard.metrics[key]}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <DashboardPanel title="Последние движения">
              {dashboard.recentMovements.length === 0 ? (
                <EmptyState title={emptyStates.movementsTitle} body={emptyStates.movementsBody} />
              ) : (
                dashboard.recentMovements.map((movement) => (
                  <Row key={movement.id}>
                    <span>{labelFor(movementTypeLabels, movement.type)}</span>
                    <span className="text-muted">
                      {movement.product.sku} / {movement.fromLocation?.code ?? "-"} → {movement.toLocation?.code ?? "-"}
                    </span>
                    <strong>{movement.quantity}</strong>
                  </Row>
                ))
              )}
            </DashboardPanel>

            <DashboardPanel title="Приёмка в работе">
              {dashboard.pendingReceiving.length === 0 ? (
                <EmptyState title="Нет открытой приёмки" body="Новые приёмки появятся здесь." />
              ) : (
                dashboard.pendingReceiving.map((session) => (
                  <Row key={session.id}>
                    <span>{session.reference ?? session.id.slice(0, 8)}</span>
                    <span className="text-muted">
                      {session.warehouse.code} / {session.receivingLocation.code}
                    </span>
                    <strong>{session._count.lines}</strong>
                  </Row>
                ))
              )}
            </DashboardPanel>

            <DashboardPanel title="Ожидает размещения">
              {dashboard.pendingPutAway.length === 0 ? (
                <EmptyState title={emptyStates.putawayTitle} body={emptyStates.putawayBody} />
              ) : (
                dashboard.pendingPutAway.map((balance) => (
                  <Row key={balance.id}>
                    <span>{balance.product.sku}</span>
                    <span className="text-muted">{balance.location.code}</span>
                    <strong>{balance.quantity}</strong>
                  </Row>
                ))
              )}
            </DashboardPanel>

            <DashboardPanel title="Сборка и расхождения">
              {dashboard.pendingPicking.map((work) => (
                <Row key={work.id}>
                  <span>{work.sourceOrder?.number ?? work.id.slice(0, 8)}</span>
                  <span className="text-muted">{work.warehouse.code}</span>
                  <strong>{work._count.lines}</strong>
                </Row>
              ))}
              {dashboard.stockDiscrepancies.map((line) => (
                <Row key={line.id}>
                  <span>{line.product.sku}</span>
                  <span className="text-muted">
                    {line.session.warehouse.code} / {line.session.location.code}
                  </span>
                  <strong>{line.difference}</strong>
                </Row>
              ))}
              {dashboard.pendingPicking.length === 0 && dashboard.stockDiscrepancies.length === 0 ? (
                <EmptyState title="Нет срочных задач" body="Открытая сборка и расхождения появятся здесь." />
              ) : null}
            </DashboardPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}

function DashboardPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-panel p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-md bg-surface px-3 py-2 text-sm sm:grid-cols-[1fr_1.3fr_auto] sm:gap-3">
      {children}
    </div>
  );
}
