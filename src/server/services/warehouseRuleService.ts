import type {
  Prisma,
  WarehouseLocationDirectiveType,
  WarehouseWorkTemplateType
} from "@prisma/client";
import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";

type Tx = Prisma.TransactionClient;

const workTemplateTypes: WarehouseWorkTemplateType[] = [
  "RECEIVE",
  "PUTAWAY",
  "TRANSFER",
  "REPLENISHMENT",
  "PICK",
  "PACK"
];

const directiveTypes: WarehouseLocationDirectiveType[] = [
  "DEFAULT_RECEIVING_LOCATION",
  "PREFERRED_PUTAWAY_ZONE",
  "PICKABLE_LOCATION",
  "DAMAGED_LOCATION",
  "REPLENISHMENT_SOURCE_ZONE",
  "REPLENISHMENT_DESTINATION_ZONE"
];

function assertWorkTemplateType(value: string): WarehouseWorkTemplateType {
  if (!workTemplateTypes.includes(value as WarehouseWorkTemplateType)) {
    throw new AppError("Invalid work template type.", 400);
  }
  return value as WarehouseWorkTemplateType;
}

function assertDirectiveType(value: string): WarehouseLocationDirectiveType {
  if (!directiveTypes.includes(value as WarehouseLocationDirectiveType)) {
    throw new AppError("Invalid location directive type.", 400);
  }
  return value as WarehouseLocationDirectiveType;
}

function assertName(value: string) {
  const name = value.trim();
  if (!name) {
    throw new AppError("Rule name is required.", 400);
  }
  if (name.length > 120) {
    throw new AppError("Rule name is too long.", 400);
  }
  return name;
}

function assertPriority(value: number | undefined) {
  if (value === undefined) {
    return 100;
  }
  if (!Number.isInteger(value) || value < 0 || value > 9999) {
    throw new AppError("Rule priority must be a whole number from 0 to 9999.", 400);
  }
  return value;
}

async function assertActiveWarehouse(tx: Tx, context: RequestContext, warehouseId: string) {
  const warehouse = await tx.warehouse.findFirst({
    where: { id: warehouseId, storeId: context.storeId, status: "ACTIVE" }
  });
  if (!warehouse) {
    throw new AppError("Active warehouse not found.", 404);
  }
  return warehouse;
}

async function validateDirectiveTarget(
  tx: Tx,
  context: RequestContext,
  input: {
    warehouseId: string;
    type: WarehouseLocationDirectiveType;
    zoneId?: string | null;
    locationId?: string | null;
  }
) {
  const needsZone = [
    "PREFERRED_PUTAWAY_ZONE",
    "REPLENISHMENT_SOURCE_ZONE",
    "REPLENISHMENT_DESTINATION_ZONE"
  ].includes(input.type);

  if (needsZone) {
    if (!input.zoneId) {
      throw new AppError("Location directive requires a zone.", 400);
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
    return { zoneId: zone.id, locationId: null };
  }

  if (!input.locationId) {
    throw new AppError("Location directive requires a location.", 400);
  }
  const location = await tx.warehouseLocation.findFirst({
    where: {
      id: input.locationId,
      storeId: context.storeId,
      warehouseId: input.warehouseId,
      status: "ACTIVE"
    }
  });
  if (!location) {
    throw new AppError("Location not found.", 404);
  }

  if (input.type === "DEFAULT_RECEIVING_LOCATION" && !location.isReceivable) {
    throw new AppError("Default receiving directive requires a receivable location.", 400);
  }
  if (input.type === "PICKABLE_LOCATION" && !location.isPickable) {
    throw new AppError("Pick directive requires a pickable location.", 400);
  }
  if (input.type === "DAMAGED_LOCATION" && location.type !== "DAMAGED") {
    throw new AppError("Damaged directive requires a damaged location.", 400);
  }

  return { zoneId: null, locationId: location.id };
}

export async function listWarehouseRules(context: RequestContext) {
  requirePermission(context.role, "WMS_VIEW");
  const [warehouses, zones, locations, workTemplates, locationDirectives] = await Promise.all([
    prisma.warehouse.findMany({
      where: { storeId: context.storeId },
      orderBy: [{ status: "asc" }, { code: "asc" }]
    }),
    prisma.warehouseZone.findMany({
      where: { storeId: context.storeId },
      include: { warehouse: true },
      orderBy: [{ warehouse: { code: "asc" } }, { code: "asc" }]
    }),
    prisma.warehouseLocation.findMany({
      where: { storeId: context.storeId },
      include: { warehouse: true, zone: true },
      orderBy: [{ warehouse: { code: "asc" } }, { code: "asc" }]
    }),
    prisma.warehouseWorkTemplate.findMany({
      where: { storeId: context.storeId },
      include: { warehouse: true },
      orderBy: [{ active: "desc" }, { priority: "asc" }, { type: "asc" }]
    }),
    prisma.warehouseLocationDirective.findMany({
      where: { storeId: context.storeId },
      include: { warehouse: true, zone: true, location: true },
      orderBy: [{ active: "desc" }, { priority: "asc" }, { type: "asc" }]
    })
  ]);
  return { warehouses, zones, locations, workTemplates, locationDirectives };
}

export async function createWorkTemplate(
  context: RequestContext,
  input: { warehouseId: string; type: string; name: string; priority?: number }
) {
  requirePermission(context.role, "WMS_MANAGE_WAREHOUSES");
  const type = assertWorkTemplateType(input.type);
  const name = assertName(input.name);
  const priority = assertPriority(input.priority);

  return prisma.$transaction(async (tx) => {
    await assertActiveWarehouse(tx, context, input.warehouseId);
    const template = await tx.warehouseWorkTemplate.create({
      data: {
        storeId: context.storeId,
        warehouseId: input.warehouseId,
        type,
        name,
        priority
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work_template.create",
      entityType: "WarehouseWorkTemplate",
      entityId: template.id,
      metadata: { warehouseId: template.warehouseId, type: template.type, name: template.name }
    });
    return template;
  });
}

export async function createLocationDirective(
  context: RequestContext,
  input: {
    warehouseId: string;
    type: string;
    name: string;
    priority?: number;
    zoneId?: string | null;
    locationId?: string | null;
  }
) {
  requirePermission(context.role, "WMS_MANAGE_WAREHOUSES");
  const type = assertDirectiveType(input.type);
  const name = assertName(input.name);
  const priority = assertPriority(input.priority);

  return prisma.$transaction(async (tx) => {
    await assertActiveWarehouse(tx, context, input.warehouseId);
    const target = await validateDirectiveTarget(tx, context, {
      warehouseId: input.warehouseId,
      type,
      zoneId: input.zoneId,
      locationId: input.locationId
    });
    const directive = await tx.warehouseLocationDirective.create({
      data: {
        storeId: context.storeId,
        warehouseId: input.warehouseId,
        type,
        name,
        priority,
        zoneId: target.zoneId,
        locationId: target.locationId
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_location_directive.create",
      entityType: "WarehouseLocationDirective",
      entityId: directive.id,
      metadata: { warehouseId: directive.warehouseId, type: directive.type, name: directive.name }
    });
    return directive;
  });
}

export async function deactivateWorkTemplate(context: RequestContext, id: string) {
  requirePermission(context.role, "WMS_MANAGE_WAREHOUSES");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.warehouseWorkTemplate.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Work template not found.", 404);
    }
    const template = await tx.warehouseWorkTemplate.update({ where: { id }, data: { active: false } });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_work_template.deactivate",
      entityType: "WarehouseWorkTemplate",
      entityId: template.id,
      metadata: { type: template.type, name: template.name }
    });
    return template;
  });
}

export async function deactivateLocationDirective(context: RequestContext, id: string) {
  requirePermission(context.role, "WMS_MANAGE_WAREHOUSES");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.warehouseLocationDirective.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Location directive not found.", 404);
    }
    const directive = await tx.warehouseLocationDirective.update({ where: { id }, data: { active: false } });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "warehouse_location_directive.deactivate",
      entityType: "WarehouseLocationDirective",
      entityId: directive.id,
      metadata: { type: directive.type, name: directive.name }
    });
    return directive;
  });
}

export async function getDefaultReceivingLocationId(tx: Tx, context: RequestContext, warehouseId: string) {
  const directives = await tx.warehouseLocationDirective.findMany({
    where: {
      storeId: context.storeId,
      warehouseId,
      type: "DEFAULT_RECEIVING_LOCATION",
      active: true,
      location: { is: { status: "ACTIVE", isReceivable: true } }
    },
    include: { location: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
  });
  return directives[0]?.locationId ?? null;
}

export async function getPickLocationIdsByPriority(tx: Tx, context: RequestContext, warehouseId: string) {
  const directives = await tx.warehouseLocationDirective.findMany({
    where: {
      storeId: context.storeId,
      warehouseId,
      type: "PICKABLE_LOCATION",
      active: true,
      location: { is: { status: "ACTIVE", isPickable: true } }
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
  });
  return directives.map((directive) => directive.locationId).filter((id): id is string => Boolean(id));
}

export async function suggestPutawayDestinationId(tx: Tx, context: RequestContext, warehouseId: string) {
  const preferredZones = await tx.warehouseLocationDirective.findMany({
    where: {
      storeId: context.storeId,
      warehouseId,
      type: "PREFERRED_PUTAWAY_ZONE",
      active: true,
      zone: { is: { status: "ACTIVE" } }
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
  });
  for (const directive of preferredZones) {
    if (!directive.zoneId) {
      continue;
    }
    const location = await tx.warehouseLocation.findFirst({
      where: {
        storeId: context.storeId,
        warehouseId,
        zoneId: directive.zoneId,
        status: "ACTIVE",
        type: { in: ["STORAGE", "PICKING"] }
      },
      orderBy: [{ isPickable: "desc" }, { code: "asc" }]
    });
    if (location) {
      return location.id;
    }
  }

  const fallback = await tx.warehouseLocation.findFirst({
    where: {
      storeId: context.storeId,
      warehouseId,
      status: "ACTIVE",
      type: { in: ["STORAGE", "PICKING"] }
    },
    orderBy: [{ isPickable: "desc" }, { code: "asc" }]
  });
  return fallback?.id ?? null;
}
