import { PackageOpen, type LucideIcon } from "lucide-react";

const variants = {
  neutral: "border-slate-300 bg-white text-muted",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-danger"
};

export function EmptyState({
  title,
  body,
  action,
  icon: Icon = PackageOpen,
  variant = "neutral"
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  variant?: keyof typeof variants;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border ${variants[variant]}`} aria-hidden="true">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
