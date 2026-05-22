"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/FeedbackState";
import { cardClass } from "@/components/FormControls";
import { PageHeader } from "@/components/PageHeader";

type TaskCenterItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  href: string;
  action: string;
  meta: string[];
  createdAt: string;
};

type TaskCenterGroup = {
  key: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  tasks: TaskCenterItem[];
};

type TaskCenter = {
  summary: {
    total: number;
    inProgress: number;
    exceptions: number;
  };
  groups: TaskCenterGroup[];
};

const summaryLabels: Record<keyof TaskCenter["summary"], string> = {
  total: "Всего действий",
  inProgress: "В работе",
  exceptions: "Требует проверки"
};

export default function TasksPage() {
  const [taskCenter, setTaskCenter] = useState<TaskCenter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTasks() {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const payload = (await response.json()) as { taskCenter?: TaskCenter; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить задачи.");
        setTaskCenter(null);
      } else {
        setError(null);
        setTaskCenter(payload.taskCenter ?? null);
      }
    }

    void loadTasks();
  }, []);

  return (
    <div>
      <PageHeader
        title="Задачи"
        description="Единый старт для ежедневной работы склада: что нужно сделать, где товар, какой статус и что делать дальше."
      />

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {!taskCenter && !error ? <LoadingState message="Загрузка задач..." /> : null}

      {taskCenter ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(taskCenter.summary) as (keyof TaskCenter["summary"])[]).map((key) => (
              <div key={key} className={cardClass}>
                <div className="text-sm font-medium text-muted">{summaryLabels[key]}</div>
                <div className="mt-2 text-2xl font-semibold text-ink">{taskCenter.summary[key]}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {taskCenter.groups.map((group) => (
              <section key={group.key} className={cardClass}>
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-ink">{group.title}</h2>
                  <p className="mt-1 text-sm text-muted">{group.description}</p>
                </div>

                {group.tasks.length === 0 ? (
                  <EmptyState title={group.emptyTitle} body={group.emptyBody} />
                ) : (
                  <div className="space-y-3">
                    {group.tasks.map((task) => (
                      <Link
                        key={task.id}
                        href={task.href}
                        className="block rounded-md border border-border bg-white p-4 transition hover:border-accent"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-ink">{task.title}</h3>
                            <p className="mt-1 text-sm text-muted">{task.description}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
                            {task.status}
                          </span>
                        </div>
                        {task.meta.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {task.meta.map((meta) => (
                              <span key={meta} className="rounded-md bg-surface px-2 py-1 text-xs text-muted">
                                {meta}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 text-sm font-semibold text-accent">{task.action}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
