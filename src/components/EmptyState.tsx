import {
  Boxes,
  ClipboardList,
  History,
  MapPinned,
  PackageCheck,
  PackageOpen,
  PackageSearch,
  RefreshCw,
  ScanSearch,
  Warehouse,
  type LucideIcon
} from "lucide-react";

const variants = {
  neutral: "border-slate-300 bg-white text-muted",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-danger"
};

export const wmsEmptyStateIcons = {
  warehouses: Warehouse,
  locations: MapPinned,
  products: Boxes,
  stock: PackageSearch,
  movements: History,
  audit: History,
  receiving: PackageCheck,
  putaway: RefreshCw,
  picking: ClipboardList,
  counts: ScanSearch,
  tasks: ClipboardList,
  default: PackageOpen
} as const satisfies Record<string, LucideIcon>;

export function EmptyState({
  title,
  body,
  description,
  action,
  icon: Icon = PackageOpen,
  variant = "neutral"
}: {
  title: string;
  body?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  variant?: keyof typeof variants;
}) {
  const text = description ?? body;

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border ${variants[variant]}`} aria-hidden="true">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {text ? <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted">{text}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
