export function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "focus-ring w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm";

export const buttonClass =
  "focus-ring inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "focus-ring inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60";
