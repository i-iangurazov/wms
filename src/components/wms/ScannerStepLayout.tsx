import { ReactNode } from "react";

export function ScannerStepLayout({
  title,
  instruction,
  scanHint,
  resultHint,
  children,
  aside
}: {
  title: string;
  instruction: string;
  scanHint: string;
  resultHint: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-panel p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Что сделать</div>
            <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-muted">{instruction}</p>
          </div>
          <div className="rounded-md bg-surface p-3">
            <div className="text-xs font-semibold uppercase text-muted">Что сканировать</div>
            <p className="mt-1 text-sm font-medium text-ink">{scanHint}</p>
          </div>
          <div className="rounded-md bg-surface p-3">
            <div className="text-xs font-semibold uppercase text-muted">После подтверждения</div>
            <p className="mt-1 text-sm font-medium text-ink">{resultHint}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
        <div>{children}</div>
        {aside ? <aside>{aside}</aside> : null}
      </div>
    </div>
  );
}
