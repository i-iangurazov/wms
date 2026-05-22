export function Field({
  label,
  children,
  helper,
  error
}: {
  label: string;
  children: React.ReactNode;
  helper?: string;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-medium text-danger">{error}</span> : null}
      {!error && helper ? <span className="mt-1.5 block text-xs text-muted">{helper}</span> : null}
    </label>
  );
}

export const inputClass =
  "wms-control focus-ring w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export const selectClass = inputClass;

export const textareaClass = `${inputClass} min-h-24 resize-y leading-6`;

export const buttonClass =
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 active:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-slate-300 hover:bg-surface active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60";

export const ghostButtonClass =
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-danger shadow-sm transition hover:bg-red-50 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60";

export const cardClass = "rounded-lg border border-border bg-panel p-5 shadow-sm";

export const tableWrapClass = "overflow-x-auto rounded-lg border border-border bg-panel shadow-sm";
