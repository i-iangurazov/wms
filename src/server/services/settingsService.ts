import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { canUseDevAuthFallback } from "@/server/auth";
import { requirePermission, rolePermissions } from "@/server/permissions";
import { AppError } from "@/server/errors";

export async function getSettingsOverview(context: RequestContext) {
  requirePermission(context.role, "WMS_VIEW");

  const [store, userCount, productCount, warehouseCount, locationCount, openWorkCount] = await Promise.all([
    prisma.store.findUnique({ where: { id: context.storeId } }),
    prisma.storeUser.count({ where: { storeId: context.storeId } }),
    prisma.product.count({ where: { storeId: context.storeId, active: true } }),
    prisma.warehouse.count({ where: { storeId: context.storeId } }),
    prisma.warehouseLocation.count({ where: { storeId: context.storeId } }),
    prisma.warehouseWork.count({ where: { storeId: context.storeId, status: { in: ["OPEN", "IN_PROGRESS"] } } })
  ]);

  if (!store) {
    throw new AppError("Invalid user or store context.", 401);
  }

  return {
    organization: {
      id: store.id,
      name: store.name,
      code: store.code,
      active: store.active
    },
    currentUser: {
      id: context.user.id,
      name: context.user.name,
      email: context.user.email,
      role: context.role
    },
    counts: {
      users: userCount,
      products: productCount,
      warehouses: warehouseCount,
      locations: locationCount,
      openWork: openWorkCount
    },
    permissions: rolePermissions[context.role],
    auth: {
      devFallbackAllowed: canUseDevAuthFallback()
    }
  };
}
