"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  History,
  LayoutDashboard,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  ScanSearch,
  Settings,
  Warehouse,
  type LucideIcon
} from "lucide-react";

const navIcons: Record<string, LucideIcon> = {
  "/wms": LayoutDashboard,
  "/wms/tasks": ClipboardList,
  "/wms/stock": Boxes,
  "/wms/receiving": PackageCheck,
  "/wms/fulfillment": PackageSearch,
  "/wms/cycle-counts": ScanSearch,
  "/wms/replenishment": RefreshCw,
  "/wms/locations": Warehouse,
  "/wms/journal": History,
  "/wms/settings": Settings
};

export function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/wms" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = navIcons[href] ?? LayoutDashboard;

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
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function MobileNavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/wms" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = navIcons[href] ?? LayoutDashboard;

  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold",
        active ? "border-teal-200 bg-teal-50 text-accent" : "border-border bg-white text-muted"
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
