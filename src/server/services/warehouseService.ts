import type { Prisma, WarehouseStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError, invariant } from "@/server/errors";
import type { RequestContext } from "@/server/auth";
import { requirePermission } from "@/server/permissions";
import { assertStoreAccess } from "@/server/storeAccess";
import { writeAuditLog } from "@/server/services/auditService";

type DbClient = Prisma.TransactionClient;

const openReceivingStatuses = ["DRAFT", "RECEIVING"] as const;
const openWorkStatuses = ["OPEN", "IN_PROGRESS"] as const;
const openCountStatuses = ["DRAFT", "COUNTING", "PENDING_APPROVAL"] as const;

async function assertWarehouseCanBeDeactivated(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  warehouseId: string
) {
  const [activeLocation, balance, receiving, work, count] = await Promise.all([
    tx.warehouseLocation.findFirst({
      where: { storeId: context.storeId, warehouseId, status: "ACTIVE" },
      select: { id: true }
    }),
    tx.inventoryLocationBalance.findFirst({
      where: {
        storeId: context.storeId,
        warehouseId,
        OR: [
          { onHandQty: { not: 0 } },
          { reservedQty: { not: 0 } },
          { pickedQty: { not: 0 } },
          { damagedQty: { not: 0 } },
          { blockedQty: { not: 0 } }
        ]
      },
      select: { id: true }
    }),
    tx.receivingSession.findFirst({
      where: { storeId: context.storeId, warehouseId, status: { in: [...openReceivingStatuses] } },
      select: { id: true }
    }),
    tx.warehouseWork.findFirst({
      where: { storeId: context.storeId, warehouseId, status: { in: [...openWorkStatuses] } },
      select: { id: true }
    }),
    tx.cycleCountSession.findFirst({
      where: { storeId: context.storeId, warehouseId, status: { in: [...openCountStatuses] } },
      select: { id: true }
    })
  ]);

  if (activeLocation) {
    throw new AppError("Cannot deactivate warehouse with active locations.", 409);
  }
  if (balance || receiving || work || count) {
    throw new AppError("Cannot deactivate warehouse with stock or open work.", 409);
  }
}

export async function listWarehouses(context: RequestContext) {
  requirePermission(context.role, "wms.view");
  await assertStoreAccess(prisma, context, context.storeId);
  return prisma.warehouse.findMany({
    where: { storeId: context.storeId },
    orderBy: [{ status: "asc" }, { code: "asc" }],
    include: { _count: { select: { locations: true } } }
  });
}

export async function getWarehouse(context: RequestContext, id: string) {
  requirePermission(context.role, "wms.view");
  const warehouse = await prisma.warehouse.findFirst({
    where: { id, storeId: context.storeId },
    include: { locations: { orderBy: { code: "asc" } } }
  });
  invariant(warehouse, "Warehouse not found.", 404);
  return warehouse;
}

export async function createWarehouse(
  context: RequestContext,
  input: { code: string; name: string; status?: WarehouseStatus }
) {
  requirePermission(context.role, "wms.manageWarehouses");
  return prisma.$transaction(async (tx) => {
    await assertStoreAccess(tx, context, context.storeId);
    const warehouse = await tx.warehouse.create({
      data: {
        storeId: context.storeId,
        code: input.code,
        name: input.name,
        status: input.status ?? "ACTIVE"
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse.create",
      entityType: "Warehouse",
      entityId: warehouse.id,
      metadata: { code: warehouse.code }
    });
    return warehouse;
  });
}

export async function updateWarehouse(
  context: RequestContext,
  id: string,
  input: { code?: string; name?: string; status?: WarehouseStatus }
) {
  requirePermission(context.role, "wms.manageWarehouses");
  return prisma.$transaction(async (tx: DbClient) => {
    await assertStoreAccess(tx, context, context.storeId);
    const existing = await tx.warehouse.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Warehouse not found.", 404);
    }
    if (input.status === "INACTIVE" && existing.status !== "INACTIVE") {
      await assertWarehouseCanBeDeactivated(tx, context, id);
    }
    const warehouse = await tx.warehouse.update({
      where: { id },
      data: {
        code: input.code ?? existing.code,
        name: input.name ?? existing.name,
        status: input.status ?? existing.status
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse.update",
      entityType: "Warehouse",
      entityId: warehouse.id,
      metadata: { before: existing, after: warehouse }
    });
    return warehouse;
  });
}

export async function deactivateWarehouse(context: RequestContext, id: string) {
  return updateWarehouse(context, id, { status: "INACTIVE" });
}
