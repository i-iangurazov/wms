type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger" | "blocked" | "progress";

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  blocked: "border-slate-300 bg-slate-100 text-slate-800",
  progress: "border-teal-200 bg-teal-50 text-teal-800"
};

export function Badge({
  children,
  variant = "neutral",
  className = ""
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
