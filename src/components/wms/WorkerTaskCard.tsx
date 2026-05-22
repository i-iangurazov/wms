import { ReactNode } from "react";

export function WorkerTaskCard({
  title,
  details,
  meta,
  actionLabel,
  onClick
}: {
  title: string;
  details: string;
  meta?: ReactNode;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      className="focus-ring w-full rounded-md border border-border bg-white p-3 text-left shadow-sm hover:border-accent"
      type="button"
      onClick={onClick}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="font-semibold text-ink">{title}</div>
          <div className="mt-1 text-sm text-muted">{details}</div>
          {meta ? <div className="mt-2 text-xs text-muted">{meta}</div> : null}
        </div>
        <span className="shrink-0 self-start rounded-md bg-surface px-2 py-1 text-xs font-semibold text-accent">
          {actionLabel}
        </span>
      </div>
    </button>
  );
}
