import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white shadow-sm hover:bg-teal-800 active:bg-teal-900",
  secondary:
    "border border-border bg-white text-ink shadow-sm hover:border-slate-300 hover:bg-surface active:bg-slate-100",
  ghost: "text-muted hover:bg-surface hover:text-ink active:bg-slate-100",
  danger:
    "border border-red-200 bg-white text-danger shadow-sm hover:bg-red-50 active:bg-red-100"
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={[
        "focus-ring inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
