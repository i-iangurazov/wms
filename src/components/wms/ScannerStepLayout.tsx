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
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-panel p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold text-accent">Что сделать</div>
            <h2 className="mt-1 text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{instruction}</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="text-xs font-semibold text-muted">Что сканировать</div>
            <p className="mt-1 text-sm font-medium text-ink">{scanHint}</p>
          </div>
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="text-xs font-semibold text-muted">После подтверждения</div>
            <p className="mt-1 text-sm font-medium text-ink">{resultHint}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
        <div>{children}</div>
        {aside ? <aside>{aside}</aside> : null}
      </div>
    </div>
  );
}
