import type { LocationType, Prisma, WarehouseStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError, invariant } from "@/server/errors";
import type { RequestContext } from "@/server/auth";
import { requirePermission } from "@/server/permissions";
import { assertStoreAccess } from "@/server/storeAccess";
import { writeAuditLog } from "@/server/services/auditService";

type LocationFlags = {
  isPickable?: boolean;
  isReceivable?: boolean;
  isSellable?: boolean;
};

const openReceivingStatuses = ["DRAFT", "RECEIVING"] as const;
const openWorkLineStatuses = ["OPEN", "IN_PROGRESS"] as const;
const openCountStatuses = ["DRAFT", "COUNTING", "PENDING_APPROVAL"] as const;

async function assertZoneCanBeDeactivated(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  zoneId: string
) {
  const activeLocation = await tx.warehouseLocation.findFirst({
    where: { storeId: context.storeId, zoneId, status: "ACTIVE" },
    select: { id: true }
  });
  if (activeLocation) {
    throw new AppError("Cannot deactivate zone with active locations.", 409);
  }
}

async function assertLocationCanBeDeactivated(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  locationId: string
) {
  const [balance, receiving, sourceWork, destinationWork, count] = await Promise.all([
    tx.inventoryLocationBalance.findFirst({
      where: {
        storeId: context.storeId,
        locationId,
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
      where: { storeId: context.storeId, receivingLocationId: locationId, status: { in: [...openReceivingStatuses] } },
      select: { id: true }
    }),
    tx.warehouseWorkLine.findFirst({
      where: {
        sourceLocationId: locationId,
        status: { in: [...openWorkLineStatuses] },
        work: { storeId: context.storeId }
      },
      select: { id: true }
    }),
    tx.warehouseWorkLine.findFirst({
      where: {
        destinationLocationId: locationId,
        status: { in: [...openWorkLineStatuses] },
        work: { storeId: context.storeId }
      },
      select: { id: true }
    }),
    tx.cycleCountSession.findFirst({
      where: { storeId: context.storeId, locationId, status: { in: [...openCountStatuses] } },
      select: { id: true }
    })
  ]);

  if (balance || receiving || sourceWork || destinationWork || count) {
    throw new AppError("Cannot deactivate location with stock or open work.", 409);
  }
}

export function defaultLocationFlags(type: LocationType): Required<LocationFlags> {
  return {
    isPickable: type === "PICKING",
    isReceivable: type === "RECEIVING" || type === "RETURNS",
    isSellable: type === "PICKING"
  };
}

export async function listLocations(context: RequestContext, warehouseId?: string) {
  requirePermission(context.role, "wms.view");
  await assertStoreAccess(prisma, context, context.storeId);
  return prisma.warehouseLocation.findMany({
    where: { storeId: context.storeId, warehouseId },
    orderBy: [{ warehouse: { code: "asc" } }, { code: "asc" }],
    include: { warehouse: true, zone: true }
  });
}

export async function getLocation(context: RequestContext, id: string) {
  requirePermission(context.role, "wms.view");
  const location = await prisma.warehouseLocation.findFirst({
    where: { id, storeId: context.storeId },
    include: { warehouse: true, zone: true }
  });
  invariant(location, "Location not found.", 404);
  return location;
}

export async function listZones(context: RequestContext, warehouseId?: string) {
  requirePermission(context.role, "wms.view");
  await assertStoreAccess(prisma, context, context.storeId);
  return prisma.warehouseZone.findMany({
    where: { storeId: context.storeId, warehouseId },
    include: { warehouse: true, _count: { select: { locations: true } } },
    orderBy: [{ warehouse: { code: "asc" } }, { code: "asc" }]
  });
}

async function assertZoneForWarehouse(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  input: { zoneId?: string | null; warehouseId: string }
) {
  if (!input.zoneId) {
    return null;
  }
  const zone = await tx.warehouseZone.findFirst({
    where: {
      id: input.zoneId,
      storeId: context.storeId,
      warehouseId: input.warehouseId,
      status: "ACTIVE"
    }
  });
  if (!zone) {
    throw new AppError("Warehouse zone not found.", 404);
  }
  return zone;
}

export async function createZone(
  context: RequestContext,
  input: { warehouseId: string; code: string; name: string; status?: WarehouseStatus }
) {
  requirePermission(context.role, "wms.manageLocations");
  return prisma.$transaction(async (tx) => {
    await assertStoreAccess(tx, context, context.storeId);
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, storeId: context.storeId }
    });
    if (!warehouse) {
      throw new AppError("Warehouse not found.", 404);
    }
    const zone = await tx.warehouseZone.create({
      data: {
        storeId: context.storeId,
        warehouseId: warehouse.id,
        code: input.code,
        name: input.name,
        status: input.status ?? "ACTIVE"
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_zone.create",
      entityType: "WarehouseZone",
      entityId: zone.id,
      metadata: { code: zone.code, warehouseId: zone.warehouseId }
    });
    return zone;
  });
}

export async function updateZone(
  context: RequestContext,
  id: string,
  input: { code?: string; name?: string; status?: WarehouseStatus }
) {
  requirePermission(context.role, "wms.manageLocations");
  return prisma.$transaction(async (tx) => {
    await assertStoreAccess(tx, context, context.storeId);
    const existing = await tx.warehouseZone.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Warehouse zone not found.", 404);
    }
    if (input.status === "INACTIVE" && existing.status !== "INACTIVE") {
      await assertZoneCanBeDeactivated(tx, context, id);
    }
    const zone = await tx.warehouseZone.update({
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
      action: "warehouse_zone.update",
      entityType: "WarehouseZone",
      entityId: zone.id,
      metadata: { before: existing, after: zone }
    });
    return zone;
  });
}

export async function deactivateZone(context: RequestContext, id: string) {
  return updateZone(context, id, { status: "INACTIVE" });
}

export async function createLocation(
  context: RequestContext,
  input: {
    warehouseId: string;
    zoneId?: string | null;
    code: string;
    barcode?: string;
    type: LocationType;
    status?: WarehouseStatus;
  } & LocationFlags
) {
  requirePermission(context.role, "wms.manageLocations");
  return prisma.$transaction(async (tx) => {
    await assertStoreAccess(tx, context, context.storeId);
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, storeId: context.storeId }
    });
    if (!warehouse) {
      throw new AppError("Warehouse not found.", 404);
    }
    await assertZoneForWarehouse(tx, context, { zoneId: input.zoneId, warehouseId: warehouse.id });
    const defaults = defaultLocationFlags(input.type);
    const location = await tx.warehouseLocation.create({
      data: {
        storeId: context.storeId,
        warehouseId: input.warehouseId,
        zoneId: input.zoneId ?? null,
        code: input.code,
        barcode: input.barcode,
        type: input.type,
        status: input.status ?? "ACTIVE",
        isPickable: input.isPickable ?? defaults.isPickable,
        isReceivable: input.isReceivable ?? defaults.isReceivable,
        isSellable: input.isSellable ?? defaults.isSellable
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_location.create",
      entityType: "WarehouseLocation",
      entityId: location.id,
      metadata: { code: location.code, warehouseId: location.warehouseId }
    });
    return location;
  });
}

export async function updateLocation(
  context: RequestContext,
  id: string,
  input: {
    code?: string;
    barcode?: string | null;
    zoneId?: string | null;
    type?: LocationType;
    status?: WarehouseStatus;
  } & LocationFlags
) {
  requirePermission(context.role, "wms.manageLocations");
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await assertStoreAccess(tx, context, context.storeId);
    const existing = await tx.warehouseLocation.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Location not found.", 404);
    }
    if (input.status === "INACTIVE" && existing.status !== "INACTIVE") {
      await assertLocationCanBeDeactivated(tx, context, id);
    }
    const effectiveType = input.type ?? existing.type;
    const defaults = defaultLocationFlags(effectiveType);
    await assertZoneForWarehouse(tx, context, {
      zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId,
      warehouseId: existing.warehouseId
    });
    const location = await tx.warehouseLocation.update({
      where: { id },
      data: {
        zoneId: input.zoneId === undefined ? existing.zoneId : input.zoneId,
        code: input.code ?? existing.code,
        barcode: input.barcode === undefined ? existing.barcode : input.barcode,
        type: effectiveType,
        status: input.status ?? existing.status,
        isPickable: input.isPickable ?? defaults.isPickable,
        isReceivable: input.isReceivable ?? defaults.isReceivable,
        isSellable: input.isSellable ?? defaults.isSellable
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_location.update",
      entityType: "WarehouseLocation",
      entityId: location.id,
      metadata: { before: existing, after: location }
    });
    return location;
  });
}

export async function deactivateLocation(context: RequestContext, id: string) {
  return updateLocation(context, id, { status: "INACTIVE" });
}
