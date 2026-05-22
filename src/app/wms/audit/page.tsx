"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { inputClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";
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
      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">{error}</div> : null}
      {loading ? <div className="text-sm text-muted">Загрузка журнала...</div> : null}
      {logs.length > 0 ? (
        <div className="mb-4 grid gap-3 rounded-lg border border-border bg-panel p-4 shadow-sm md:grid-cols-[1fr_260px]">
          <input
            className={inputClass}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по сотруднику, действию или объекту"
          />
          <select className={inputClass} value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="ALL">Все действия</option>
            {Object.entries(auditActionLabels).map(([action, label]) => (
              <option key={action} value={action}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {!loading && logs.length === 0 ? <EmptyState title={emptyStates.auditTitle} body={emptyStates.auditBody} /> : null}
      {!loading && logs.length > 0 && filteredLogs.length === 0 ? (
        <EmptyState title="Действия не найдены" body="Попробуйте изменить поиск или фильтр." />
      ) : null}
      {filteredLogs.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-panel shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Время</th>
                <th className="px-4 py-3">Действие</th>
                <th className="px-4 py-3">Объект</th>
                <th className="px-4 py-3">Детали</th>
                <th className="px-4 py-3">Сотрудник</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{labelFor(auditActionLabels, log.action)}</td>
                  <td className="px-4 py-3">
                    <div>{labelFor(auditEntityLabels, log.entityType)}</div>
                    <div className="text-xs text-muted">{log.entityId}</div>
                  </td>
                  <td className="px-4 py-3">{metadataSummary(log.metadata) || commonText.none}</td>
                  <td className="px-4 py-3">
                    <div>{log.user.name}</div>
                    <div className="text-xs text-muted">{log.user.email}</div>
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
