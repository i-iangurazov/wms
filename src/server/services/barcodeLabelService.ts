import type { BarcodeLabelEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import { normalizeBarcodeScan } from "@/server/services/barcodeService";

const barcodeLabelTypes: BarcodeLabelEntityType[] = ["PRODUCT", "PRODUCT_VARIANT", "LOCATION", "ORDER", "WORK"];

export function assertBarcodeLabelType(value: string): BarcodeLabelEntityType {
  const normalized = value.trim().toUpperCase();
  if (!barcodeLabelTypes.includes(normalized as BarcodeLabelEntityType)) {
    throw new AppError("Invalid barcode label type.", 400);
  }
  return normalized as BarcodeLabelEntityType;
}

export function normalizeBarcodeLabelCode(code: string) {
  const normalized = normalizeBarcodeScan(code);
  if (!normalized) {
    throw new AppError("Barcode label code is required.", 400);
  }
  if (normalized.length > 120) {
    throw new AppError("Barcode label code is too long.", 400);
  }
  return normalized;
}

export function barcodePermissionForType(type: BarcodeLabelEntityType) {
  if (type === "LOCATION") {
    return "WMS_MANAGE_WAREHOUSES" as const;
  }
  return "WMS_MANAGE_BARCODES" as const;
}

function targetData(type: BarcodeLabelEntityType, targetId: string) {
  return {
    productId: type === "PRODUCT" ? targetId : null,
    variantId: type === "PRODUCT_VARIANT" ? targetId : null,
    locationId: type === "LOCATION" ? targetId : null,
    orderId: type === "ORDER" ? targetId : null,
    workId: type === "WORK" ? targetId : null
  };
}

function sameLegacyTarget(type: BarcodeLabelEntityType, targetId: string, candidate: { type: BarcodeLabelEntityType; id: string }) {
  return type === candidate.type && targetId === candidate.id;
}

async function assertTargetExists(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  input: { type: BarcodeLabelEntityType; targetId: string }
) {
  if (input.type === "PRODUCT") {
    const product = await tx.product.findFirst({ where: { id: input.targetId, storeId: context.storeId, active: true } });
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
    return;
  }
  if (input.type === "PRODUCT_VARIANT") {
    const variant = await tx.productVariant.findFirst({
      where: { id: input.targetId, storeId: context.storeId, active: true }
    });
    if (!variant) {
      throw new AppError("Product variant not found.", 404);
    }
    return;
  }
  if (input.type === "LOCATION") {
    const location = await tx.warehouseLocation.findFirst({
      where: { id: input.targetId, storeId: context.storeId, status: "ACTIVE" }
    });
    if (!location) {
      throw new AppError("Location not found.", 404);
    }
    return;
  }
  if (input.type === "ORDER") {
    const order = await tx.customerOrder.findFirst({ where: { id: input.targetId, storeId: context.storeId } });
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    return;
  }
  const work = await tx.warehouseWork.findFirst({ where: { id: input.targetId, storeId: context.storeId } });
  if (!work) {
    throw new AppError("Warehouse work not found.", 404);
  }
}

export async function assertBarcodeLabelCodeAvailable(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  input: { code: string; type: BarcodeLabelEntityType; targetId: string }
) {
  const existingLabel = await tx.barcodeLabel.findFirst({
    where: { storeId: context.storeId, code: input.code, active: true }
  });
  if (existingLabel) {
    throw new AppError("Barcode label already exists.", 409);
  }

  const [product, variant, location, order, work] = await Promise.all([
    tx.product.findFirst({
      where: { storeId: context.storeId, active: true, OR: [{ sku: input.code }, { barcode: input.code }] },
      select: { id: true }
    }),
    tx.productVariant.findFirst({
      where: { storeId: context.storeId, active: true, OR: [{ sku: input.code }, { barcode: input.code }] },
      select: { id: true }
    }),
    tx.warehouseLocation.findFirst({
      where: { storeId: context.storeId, OR: [{ code: input.code }, { barcode: input.code }] },
      select: { id: true }
    }),
    tx.customerOrder.findFirst({
      where: { storeId: context.storeId, number: input.code },
      select: { id: true }
    }),
    tx.warehouseWork.findFirst({
      where: { storeId: context.storeId, id: input.code },
      select: { id: true }
    })
  ]);

  const conflicts = [
    product ? { type: "PRODUCT" as const, id: product.id } : null,
    variant ? { type: "PRODUCT_VARIANT" as const, id: variant.id } : null,
    location ? { type: "LOCATION" as const, id: location.id } : null,
    order ? { type: "ORDER" as const, id: order.id } : null,
    work ? { type: "WORK" as const, id: work.id } : null
  ].filter(Boolean);

  const conflictingTarget = conflicts.find(
    (candidate) => candidate && !sameLegacyTarget(input.type, input.targetId, candidate)
  );
  if (conflictingTarget) {
    throw new AppError("Barcode label conflicts with an existing record.", 409);
  }
}

export async function listBarcodeLabels(context: RequestContext) {
  requirePermission(context.role, "WMS_VIEW");
  return prisma.barcodeLabel.findMany({
    where: { storeId: context.storeId, active: true },
    include: {
      product: true,
      variant: { include: { product: true } },
      location: { include: { warehouse: true } },
      order: true,
      work: { include: { sourceOrder: true, warehouse: true } },
      createdBy: true
    },
    orderBy: [{ type: "asc" }, { code: "asc" }]
  });
}

export async function createBarcodeLabel(
  context: RequestContext,
  input: { code: string; type: string; targetId: string; note?: string | null }
) {
  const type = assertBarcodeLabelType(input.type);
  requirePermission(context.role, barcodePermissionForType(type));
  const code = normalizeBarcodeLabelCode(input.code);
  const targetId = input.targetId.trim();
  if (!targetId) {
    throw new AppError("Barcode target is required.", 400);
  }

  return prisma.$transaction(async (tx) => {
    await assertTargetExists(tx, context, { type, targetId });
    await assertBarcodeLabelCodeAvailable(tx, context, { code, type, targetId });
    const label = await tx.barcodeLabel.create({
      data: {
        storeId: context.storeId,
        code,
        type,
        ...targetData(type, targetId),
        note: input.note?.trim() || null,
        createdById: context.user.id
      }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "barcode_label.create",
      entityType: "BarcodeLabel",
      entityId: label.id,
      metadata: { code: label.code, type: label.type }
    });
    return label;
  });
}

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function barcodeLabelTargetName(label: Awaited<ReturnType<typeof listBarcodeLabels>>[number]) {
  if (label.product) {
    return `${label.product.sku} · ${label.product.name}`;
  }
  if (label.variant) {
    return `${label.variant.sku} · ${label.variant.product.name} / ${label.variant.name}`;
  }
  if (label.location) {
    return `${label.location.code} · ${label.location.warehouse.code}`;
  }
  if (label.order) {
    return label.order.number;
  }
  if (label.work) {
    return label.work.sourceOrder?.number ?? label.work.id;
  }
  return "";
}

export function exportBarcodeLabelsCsv(labels: Awaited<ReturnType<typeof listBarcodeLabels>>) {
  const rows = [
    ["code", "type", "target", "note"],
    ...labels.map((label) => [label.code, label.type, barcodeLabelTargetName(label), label.note ?? ""])
  ];
  return `${rows.map((row) => row.map(csvValue).join(",")).join("\n")}\n`;
}
