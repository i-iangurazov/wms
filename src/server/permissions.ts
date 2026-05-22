import type { Role } from "@prisma/client";
import { AppError } from "@/server/errors";
import {
  canonicalPermission,
  roleHasPermission,
  rolePermissions,
  type Permission,
  type PermissionKey
} from "@/lib/permissionModel";

export type WmsPermission = PermissionKey;
export type { Permission, PermissionKey };
export { canonicalPermission, rolePermissions };

export function hasPermission(role: Role, permission: WmsPermission) {
  return roleHasPermission(role, permission);
}

export function requirePermission(role: Role, permission: WmsPermission) {
  if (!hasPermission(role, permission)) {
    throw new AppError("У вас нет доступа к этому действию", 403);
  }
}
