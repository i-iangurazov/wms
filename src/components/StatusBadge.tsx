import { labelFor, statusLabels } from "@/lib/wmsText";

export function StatusBadge({ value }: { value: string }) {
  const active =
    value === "ACTIVE" ||
    value === "OPEN" ||
    value === "RECEIVING" ||
    value === "COUNTING" ||
    value === "IN_PROGRESS";
  return (
    <span
      className={[
        "inline-flex rounded px-2 py-1 text-xs font-semibold",
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
      ].join(" ")}
    >
      {labelFor(statusLabels, value)}
    </span>
  );
}
