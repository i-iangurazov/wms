"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavItem({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = href === "/wms" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
        active ? "bg-teal-50 text-accent" : "text-muted hover:bg-surface hover:text-ink"
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-white text-xs font-bold",
          active
            ? "border-teal-200 text-accent"
            : "border-border text-muted group-hover:border-accent group-hover:text-accent"
        ].join(" ")}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function MobileNavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/wms" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={[
        "inline-flex whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold",
        active ? "border-teal-200 bg-teal-50 text-accent" : "border-border bg-white text-muted"
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
