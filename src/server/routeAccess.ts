import type { Role } from "@prisma/client";
import { wmsNavItems } from "@/lib/wmsText";
import { hasPermission, type WmsPermission } from "@/server/permissions";

export function canAccessWmsPermission(role: Role | null | undefined, permission: WmsPermission | undefined) {
  if (!permission) {
    return true;
  }
  return Boolean(role && hasPermission(role, permission));
}

export function visibleWmsNavItems(role: Role | null | undefined) {
  return wmsNavItems.filter((item) => canAccessWmsPermission(role, item.permission));
}

export const protectedRouteMatrix = [
  { path: "/wms", permission: "WMS_VIEW" },
  { path: "/wms/locations", permission: "WMS_MANAGE_WAREHOUSES" },
  { path: "/wms/products", permission: "WMS_MANAGE_PRODUCTS" },
  { path: "/wms/barcodes", permission: "WMS_MANAGE_BARCODES" },
  { path: "/wms/inventory", permission: "WMS_VIEW" },
  { path: "/wms/receiving", permission: "WMS_RECEIVE_STOCK" },
  { path: "/wms/put-away", permission: "WMS_MOVE_STOCK" },
  { path: "/wms/replenishment", permission: "WMS_MOVE_STOCK" },
  { path: "/wms/transfers", permission: "WMS_MOVE_STOCK" },
  { path: "/wms/picking", permission: "WMS_PICK" },
  { path: "/wms/packing", permission: "WMS_PICK" },
  { path: "/wms/cycle-counts", permission: "WMS_CYCLE_COUNT" },
  { path: "/wms/movements", permission: "WMS_VIEW" },
  { path: "/wms/reconciliation", permission: "WMS_VIEW_AUDIT" },
  { path: "/wms/audit", permission: "WMS_VIEW_AUDIT" },
  { path: "/wms/settings", permission: "WMS_MANAGE_WAREHOUSES" }
] as const satisfies Array<{ path: string; permission: WmsPermission }>;
