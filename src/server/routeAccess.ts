import type { Role } from "@prisma/client";
import { wmsNavItems } from "@/lib/wmsText";
import {
  canRoleAccessWmsPath,
  protectedRouteMatrix,
  roleHasPermission,
  type PermissionKey
} from "@/lib/permissionModel";

export function canAccessWmsPermission(role: Role | null | undefined, permission: PermissionKey | undefined) {
  if (!permission) {
    return true;
  }
  return Boolean(role && roleHasPermission(role, permission));
}

export function visibleWmsNavItems(role: Role | null | undefined) {
  return wmsNavItems.filter((item) => canAccessWmsPermission(role, item.permission));
}

export { canRoleAccessWmsPath, protectedRouteMatrix };
