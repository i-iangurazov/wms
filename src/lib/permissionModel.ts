export type WmsRole =
  | "OWNER"
  | "ADMIN"
  | "WAREHOUSE_MANAGER"
  | "WAREHOUSE_WORKER"
  | "VIEWER"
  | "MANAGER"
  | "STAFF"
  | "CASHIER";

export type Permission =
  | "org.manage"
  | "users.manage"
  | "wms.view"
  | "wms.manageWarehouses"
  | "wms.manageLocations"
  | "products.manage"
  | "barcodes.manage"
  | "receiving.execute"
  | "putaway.execute"
  | "transfers.execute"
  | "adjustments.create"
  | "cycleCounts.execute"
  | "cycleCounts.approve"
  | "picking.create"
  | "picking.execute"
  | "packing.execute"
  | "reports.view"
  | "audit.view";

export type LegacyPermission =
  | "WMS_VIEW"
  | "WMS_VIEW_AUDIT"
  | "WMS_MANAGE_USERS"
  | "WMS_MANAGE_PRODUCTS"
  | "WMS_MANAGE_BARCODES"
  | "WMS_MANAGE_WAREHOUSES"
  | "WMS_MOVE_STOCK"
  | "WMS_RECEIVE_STOCK"
  | "WMS_ADJUST_STOCK"
  | "WMS_CYCLE_COUNT"
  | "WMS_APPROVE_CYCLE_COUNT"
  | "WMS_PICK";

export type PermissionKey = Permission | LegacyPermission;

export const allPermissions: Permission[] = [
  "org.manage",
  "users.manage",
  "wms.view",
  "wms.manageWarehouses",
  "wms.manageLocations",
  "products.manage",
  "barcodes.manage",
  "receiving.execute",
  "putaway.execute",
  "transfers.execute",
  "adjustments.create",
  "cycleCounts.execute",
  "cycleCounts.approve",
  "picking.create",
  "picking.execute",
  "packing.execute",
  "reports.view",
  "audit.view"
];

export const legacyPermissionAliases: Record<LegacyPermission, Permission> = {
  WMS_VIEW: "wms.view",
  WMS_VIEW_AUDIT: "audit.view",
  WMS_MANAGE_USERS: "users.manage",
  WMS_MANAGE_PRODUCTS: "products.manage",
  WMS_MANAGE_BARCODES: "barcodes.manage",
  WMS_MANAGE_WAREHOUSES: "wms.manageWarehouses",
  WMS_MOVE_STOCK: "transfers.execute",
  WMS_RECEIVE_STOCK: "receiving.execute",
  WMS_ADJUST_STOCK: "adjustments.create",
  WMS_CYCLE_COUNT: "cycleCounts.execute",
  WMS_APPROVE_CYCLE_COUNT: "cycleCounts.approve",
  WMS_PICK: "picking.execute"
};

const ownerPermissions = allPermissions;

const adminPermissions = allPermissions.filter((permission) => permission !== "org.manage");

const warehouseManagerPermissions: Permission[] = [
  "wms.view",
  "wms.manageWarehouses",
  "wms.manageLocations",
  "products.manage",
  "barcodes.manage",
  "receiving.execute",
  "putaway.execute",
  "transfers.execute",
  "adjustments.create",
  "cycleCounts.execute",
  "cycleCounts.approve",
  "picking.create",
  "picking.execute",
  "packing.execute",
  "reports.view",
  "audit.view"
];

const warehouseWorkerPermissions: Permission[] = [
  "wms.view",
  "receiving.execute",
  "putaway.execute",
  "transfers.execute",
  "cycleCounts.execute",
  "picking.execute",
  "packing.execute"
];

export const rolePermissions: Record<WmsRole, Permission[]> = {
  OWNER: ownerPermissions,
  ADMIN: adminPermissions,
  WAREHOUSE_MANAGER: warehouseManagerPermissions,
  WAREHOUSE_WORKER: warehouseWorkerPermissions,
  VIEWER: ["wms.view", "reports.view", "audit.view"],
  MANAGER: warehouseManagerPermissions,
  STAFF: warehouseWorkerPermissions,
  CASHIER: []
};

export const protectedRouteMatrix = [
  { path: "/wms", permission: "wms.view" },
  { path: "/wms/tasks", permission: "wms.view" },
  { path: "/wms/stock", permission: "wms.view" },
  { path: "/wms/fulfillment", permission: "picking.execute" },
  { path: "/wms/journal", permission: "audit.view" },
  { path: "/wms/locations", permission: "wms.manageLocations" },
  { path: "/wms/warehouses", permission: "wms.manageWarehouses" },
  { path: "/wms/products", permission: "products.manage" },
  { path: "/wms/barcodes", permission: "barcodes.manage" },
  { path: "/wms/inventory", permission: "wms.view" },
  { path: "/wms/receiving", permission: "receiving.execute" },
  { path: "/wms/put-away", permission: "putaway.execute" },
  { path: "/wms/replenishment", permission: "putaway.execute" },
  { path: "/wms/transfers", permission: "transfers.execute" },
  { path: "/wms/adjustments", permission: "adjustments.create" },
  { path: "/wms/picking", permission: "picking.execute" },
  { path: "/wms/packing", permission: "packing.execute" },
  { path: "/wms/cycle-counts", permission: "cycleCounts.execute" },
  { path: "/wms/movements", permission: "wms.view" },
  { path: "/wms/reconciliation", permission: "reports.view" },
  { path: "/wms/audit", permission: "audit.view" },
  { path: "/wms/settings", permission: "users.manage" }
] as const satisfies ReadonlyArray<{ path: string; permission: Permission }>;

const protectedRouteMatrixBySpecificity = [...protectedRouteMatrix].sort((left, right) => right.path.length - left.path.length);

export function canonicalPermission(permission: PermissionKey): Permission {
  return legacyPermissionAliases[permission as LegacyPermission] ?? (permission as Permission);
}

export function roleHasPermission(role: WmsRole, permission: PermissionKey) {
  return rolePermissions[role].includes(canonicalPermission(permission));
}

export function permissionForWmsPath(pathname: string): Permission | undefined {
  if (!pathname.startsWith("/wms")) {
    return undefined;
  }
  return protectedRouteMatrixBySpecificity.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    ?.permission;
}

export function canRoleAccessWmsPath(role: WmsRole | null | undefined, pathname: string) {
  const permission = permissionForWmsPath(pathname);
  if (!permission) {
    return true;
  }
  return Boolean(role && roleHasPermission(role, permission));
}
