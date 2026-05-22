import type { Role } from "@prisma/client";
import { AppError } from "@/server/errors";

export type WmsPermission =
  | "WMS_VIEW"
  | "WMS_VIEW_AUDIT"
  | "WMS_MANAGE_USERS"
  | "WMS_MANAGE_PRODUCTS"
  | "WMS_MANAGE_WAREHOUSES"
  | "WMS_MOVE_STOCK"
  | "WMS_RECEIVE_STOCK"
  | "WMS_ADJUST_STOCK"
  | "WMS_CYCLE_COUNT"
  | "WMS_APPROVE_CYCLE_COUNT"
  | "WMS_PICK";

const managerPermissions: WmsPermission[] = [
  "WMS_VIEW",
  "WMS_VIEW_AUDIT",
  "WMS_MANAGE_PRODUCTS",
  "WMS_MANAGE_WAREHOUSES",
  "WMS_MOVE_STOCK",
  "WMS_RECEIVE_STOCK",
  "WMS_ADJUST_STOCK",
  "WMS_CYCLE_COUNT",
  "WMS_APPROVE_CYCLE_COUNT",
  "WMS_PICK"
];

export const rolePermissions: Record<Role, WmsPermission[]> = {
  OWNER: [...managerPermissions, "WMS_MANAGE_USERS"],
  ADMIN: [...managerPermissions, "WMS_MANAGE_USERS"],
  WAREHOUSE_MANAGER: managerPermissions,
  WAREHOUSE_WORKER: ["WMS_VIEW", "WMS_MOVE_STOCK", "WMS_RECEIVE_STOCK", "WMS_CYCLE_COUNT", "WMS_PICK"],
  VIEWER: ["WMS_VIEW", "WMS_VIEW_AUDIT"],
  MANAGER: managerPermissions,
  STAFF: ["WMS_VIEW", "WMS_MOVE_STOCK", "WMS_RECEIVE_STOCK", "WMS_CYCLE_COUNT", "WMS_PICK"],
  CASHIER: []
};

export function hasPermission(role: Role, permission: WmsPermission) {
  return rolePermissions[role].includes(permission);
}

export function requirePermission(role: Role, permission: WmsPermission) {
  if (!hasPermission(role, permission)) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
}
