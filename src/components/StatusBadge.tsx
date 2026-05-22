import { labelFor, statusLabels } from "@/lib/wmsText";

export function StatusBadge({ value }: { value: string }) {
  const tone = statusTone(value);
  return (
    <span
      className={[
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        toneClasses[tone]
      ].join(" ")}
    >
      {labelFor(statusLabels, value)}
    </span>
  );
}

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "blocked" | "progress";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  blocked: "border-slate-300 bg-slate-100 text-slate-800",
  progress: "border-teal-200 bg-teal-50 text-teal-800"
};

function statusTone(value: string): StatusTone {
  if (
    [
      "ACTIVE",
      "COMPLETED",
      "APPROVED",
      "RECEIVED",
      "PICKED",
      "PACKED",
      "READY_TO_SHIP",
      "RELEASED"
    ].includes(value)
  ) {
    return "success";
  }
  if (["OPEN", "RECEIVING", "COUNTING", "IN_PROGRESS", "PICKING", "PACKING", "RESERVED"].includes(value)) {
    return "progress";
  }
  if (["ALLOCATED", "DRAFT"].includes(value)) {
    return "info";
  }
  if (
    [
      "PENDING_APPROVAL",
      "CLOSED_SHORT",
      "OVER_RECEIVED",
      "SHORT",
      "SHORT_PICKED",
      "SHORT_PICK_REVIEW"
    ].includes(value)
  ) {
    return "warning";
  }
  if (["CANCELLED"].includes(value)) {
    return "danger";
  }
  if (["INACTIVE", "BLOCKED", "DAMAGED"].includes(value)) {
    return "blocked";
  }
  return "neutral";
}
