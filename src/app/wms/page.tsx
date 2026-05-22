"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  History,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  ScanSearch,
  Warehouse,
  type LucideIcon
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { cardClass } from "@/components/FormControls";
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

const metricIcons: Record<keyof Dashboard["metrics"], LucideIcon> = {
  activeWarehouses: Warehouse,
  activeLocations: Warehouse,
  totalUnits: PackageCheck,
  pendingReceiving: PackageCheck,
  pendingPutAway: RefreshCw,
  pendingPicking: PackageSearch,
  stockDiscrepancies: AlertTriangle
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
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {!dashboard ? <LoadingState message="Загрузка обзора..." /> : null}
      {dashboard ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className={`${cardClass} bg-white`}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-accent">Что требует действия сейчас</p>
                  <h2 className="mt-1 text-xl font-semibold text-ink">Операционный центр склада</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    Сначала обработайте приёмку, размещение, сборку и расхождения. Метрики ниже служат контекстом,
                    а не заменяют рабочие действия.
                  </p>
                </div>
                <ClipboardList className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ActionCard
                  icon={PackageCheck}
                  title="Принять товар"
                  value={dashboard.metrics.pendingReceiving}
                  description="Открытые приёмки и строки, которые ждут подтверждения."
                  href="/wms/receiving"
                  action="Открыть приёмку"
                  urgent={dashboard.metrics.pendingReceiving > 0}
                />
                <ActionCard
                  icon={RefreshCw}
                  title="Разместить товар"
                  value={dashboard.metrics.pendingPutAway}
                  description="Товар в зоне приёмки, который нужно перенести в ячейки."
                  href="/wms/put-away"
                  action="Открыть размещение"
                  urgent={dashboard.metrics.pendingPutAway > 0}
                />
                <ActionCard
                  icon={PackageSearch}
                  title="Собрать заказы"
                  value={dashboard.metrics.pendingPicking}
                  description="Задания сборки, которые готовы к выполнению или требуют внимания."
                  href="/wms/picking"
                  action="Открыть сборку"
                  urgent={dashboard.metrics.pendingPicking > 0}
                />
                <ActionCard
                  icon={ScanSearch}
                  title="Проверить расхождения"
                  value={dashboard.metrics.stockDiscrepancies}
                  description="Инвентаризация и сверка, где количество не совпадает."
                  href="/wms/reconciliation"
                  action="Проверить остатки"
                  urgent={dashboard.metrics.stockDiscrepancies > 0}
                />
              </div>
            </div>

            <div className={`${cardClass} bg-slate-950 text-white`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-teal-200">Следующий шаг</p>
                  <h2 className="mt-1 text-xl font-semibold">Работайте из задач</h2>
                </div>
                <ClipboardList className="h-6 w-6 text-teal-200" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Для сотрудников склада главный вход — `Задачи`: там видно, что сканировать, где товар и что делать дальше.
              </p>
              <Link
                href="/wms/tasks"
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Перейти к задачам
              </Link>
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(dashboard.metrics) as (keyof Dashboard["metrics"])[]).map((key) => (
              <div key={key} className={cardClass}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-muted">{metricLabels[key]}</div>
                  {(() => {
                    const Icon = metricIcons[key];
                    return <Icon className="h-4 w-4 text-muted" aria-hidden="true" />;
                  })()}
                </div>
                <div className="mt-2 text-2xl font-semibold">{dashboard.metrics[key]}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <DashboardPanel title="Последние движения">
              {dashboard.recentMovements.length === 0 ? (
                <EmptyState icon={History} title={emptyStates.movementsTitle} body={emptyStates.movementsBody} />
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
                <EmptyState icon={PackageCheck} title="Нет открытой приёмки" body="Новые приёмки появятся здесь." />
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
                <EmptyState icon={RefreshCw} title={emptyStates.putawayTitle} body={emptyStates.putawayBody} />
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
                <EmptyState icon={ClipboardList} title="Нет срочных задач" body="Открытая сборка и расхождения появятся здесь." />
              ) : null}
            </DashboardPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  value,
  description,
  href,
  action,
  urgent
}: {
  icon: LucideIcon;
  title: string;
  value: number;
  description: string;
  href: string;
  action: string;
  urgent: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md",
        urgent ? "border-amber-200 bg-amber-50" : "border-border bg-surface"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-md border bg-white p-2 ${urgent ? "border-amber-200 text-amber-700" : "border-border text-accent"}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${urgent ? "bg-amber-100 text-amber-800" : "bg-white text-muted"}`}>
          {value}
        </div>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-3 text-sm font-semibold text-accent group-hover:text-teal-800">{action}</div>
    </Link>
  );
}

function DashboardPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={cardClass}>
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
