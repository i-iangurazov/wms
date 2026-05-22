"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { cardClass, inputClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, Select } from "@/components/ui";
import { formatWmsDateTime } from "@/lib/dateFormat";
import { auditActionLabels, auditEntityLabels, commonText, emptyStates, labelFor } from "@/lib/wmsText";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
  user: { name: string; email: string };
};

function metadataSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "";
  }
  const record = metadata as Record<string, unknown>;
  const values = [record.code, record.sku, record.barcode, record.reference, record.type]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .slice(0, 3);
  return values.join(" · ");
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const summary = metadataSummary(log.metadata).toLowerCase();
      const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
      const matchesQuery =
        !query ||
        log.user.name.toLowerCase().includes(query) ||
        log.user.email.toLowerCase().includes(query) ||
        labelFor(auditActionLabels, log.action).toLowerCase().includes(query) ||
        labelFor(auditEntityLabels, log.entityType).toLowerCase().includes(query) ||
        log.entityId.toLowerCase().includes(query) ||
        summary.includes(query);
      return matchesAction && matchesQuery;
    });
  }, [actionFilter, logs, search]);

  const columns = useMemo<ColumnDef<AuditLog, unknown>[]>(
    () => [
      {
        id: "createdAt",
        header: "Время",
        cell: ({ row }) => formatWmsDateTime(row.original.createdAt),
        meta: { minWidth: "180px", sortValue: (row) => new Date(row.createdAt).getTime() }
      },
      {
        id: "action",
        header: "Действие",
        cell: ({ row }) => <span className="font-medium">{labelFor(auditActionLabels, row.original.action)}</span>,
        meta: { minWidth: "190px", sortValue: (row) => labelFor(auditActionLabels, row.action) }
      },
      {
        id: "entity",
        header: "Объект",
        cell: ({ row }) => (
          <div>
            <div>{labelFor(auditEntityLabels, row.original.entityType)}</div>
            <div className="mt-1 max-w-[220px] truncate text-xs text-muted">{row.original.entityId}</div>
          </div>
        ),
        meta: { minWidth: "220px", sortValue: (row) => labelFor(auditEntityLabels, row.entityType) }
      },
      {
        id: "details",
        header: "Детали",
        cell: ({ row }) => metadataSummary(row.original.metadata) || commonText.none,
        meta: { minWidth: "190px" }
      },
      {
        id: "user",
        header: "Сотрудник",
        cell: ({ row }) => (
          <div>
            <div>{row.original.user.name}</div>
            <div className="mt-1 text-xs text-muted">{row.original.user.email}</div>
          </div>
        ),
        meta: { minWidth: "220px", sortValue: (row) => row.user.name }
      }
    ],
    []
  );

  useEffect(() => {
    async function loadLogs() {
      const response = await fetch("/api/audit-logs", { cache: "no-store" });
      const payload = (await response.json()) as { logs?: AuditLog[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить журнал действий.");
      } else {
        setLogs(payload.logs ?? []);
      }
      setLoading(false);
    }
    void loadLogs();
  }, []);

  return (
    <div>
      <PageHeader
        title="Журнал действий"
        description="Кто и когда менял склады, товары, задания и остатки."
      />
      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {loading ? <LoadingState message="Загрузка журнала..." /> : null}
      {logs.length > 0 ? (
        <div className={`${cardClass} mb-4 grid gap-3 md:grid-cols-[1fr_260px]`}>
          <input
            className={inputClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по сотруднику, действию или объекту"
          />
          <Select
            value={actionFilter}
            onValueChange={setActionFilter}
            options={[
              { value: "ALL", label: "Все действия" },
              ...Object.entries(auditActionLabels).map(([action, label]) => ({ value: action, label }))
            ]}
          />
        </div>
      ) : null}
      {!loading && logs.length === 0 ? <EmptyState title={emptyStates.auditTitle} body={emptyStates.auditBody} /> : null}
      {!loading && logs.length > 0 && filteredLogs.length === 0 ? (
        <EmptyState title="Действия не найдены" body="Попробуйте изменить поиск или фильтр." />
      ) : null}
      {filteredLogs.length > 0 ? (
        <DataTable data={filteredLogs} columns={columns} getRowId={(row) => row.id} />
      ) : null}
    </div>
  );
}
