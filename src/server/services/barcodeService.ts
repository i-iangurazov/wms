import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";

export type BarcodeEntityType = "LOCATION" | "PRODUCT" | "ORDER" | "WORK";

export type BarcodeResolutionCandidate = {
  type: BarcodeEntityType;
  id: string;
  label: string;
  payload: Record<string, unknown>;
};

const barcodeTypes: BarcodeEntityType[] = ["LOCATION", "PRODUCT", "ORDER", "WORK"];

export function normalizeBarcodeScan(scan: string) {
  return scan.replace(/[\r\n\t]/g, "").trim();
}

export function parseBarcodeEntityType(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  if (!barcodeTypes.includes(normalized as BarcodeEntityType)) {
    throw new AppError("Invalid barcode type.", 400);
  }
  return normalized as BarcodeEntityType;
}

export function selectBarcodeResolution(
  candidates: BarcodeResolutionCandidate[],
  expectedType?: BarcodeEntityType
) {
  const scopedCandidates = expectedType
    ? candidates.filter((candidate) => candidate.type === expectedType)
    : candidates;

  if (scopedCandidates.length === 0) {
    throw new AppError("Barcode was not found.", 404);
  }
  if (scopedCandidates.length > 1) {
    throw new AppError("Barcode matches multiple records.", 409);
  }
  return scopedCandidates[0];
}

export async function resolveBarcode(
  context: RequestContext,
  input: { scan: string; expectedType?: BarcodeEntityType }
) {
  requirePermission(context.role, "WMS_VIEW");
  const scan = normalizeBarcodeScan(input.scan);
  if (!scan) {
    throw new AppError("Barcode scan is required.", 400);
  }

  const [labels, locations, products, variants, orders, workItems] = await Promise.all([
    prisma.barcodeLabel.findMany({
      where: { storeId: context.storeId, code: scan, active: true },
      include: {
        product: true,
        variant: { include: { product: true } },
        location: { include: { warehouse: true } },
        order: true,
        work: { include: { sourceOrder: true, warehouse: true } }
      },
      take: 3
    }),
    prisma.warehouseLocation.findMany({
      where: {
        storeId: context.storeId,
        OR: [{ code: scan }, { barcode: scan }]
      },
      include: { warehouse: true },
      take: 2
    }),
    prisma.product.findMany({
      where: {
        storeId: context.storeId,
        active: true,
        OR: [{ sku: scan }, { barcode: scan }]
      },
      take: 2
    }),
    prisma.productVariant.findMany({
      where: {
        storeId: context.storeId,
        active: true,
        OR: [{ sku: scan }, { barcode: scan }]
      },
      include: { product: true },
      take: 2
    }),
    prisma.customerOrder.findMany({
      where: { storeId: context.storeId, number: scan },
      take: 2
    }),
    prisma.warehouseWork.findMany({
      where: {
        storeId: context.storeId,
        OR: [{ id: scan }, { sourceOrder: { number: scan } }]
      },
      include: { sourceOrder: true, warehouse: true },
      take: 2
    })
  ]);

  const candidates: BarcodeResolutionCandidate[] = dedupeBarcodeCandidates([
    ...labels.flatMap((label): BarcodeResolutionCandidate[] => {
      if (label.type === "PRODUCT" && label.product) {
        return [
          {
            type: "PRODUCT" as const,
            id: label.product.id,
            label: `${label.product.sku} · ${label.product.name}`,
            payload: {
              id: label.product.id,
              productId: label.product.id,
              variantId: null,
              sku: label.product.sku,
              barcode: label.code,
              name: label.product.name,
              labelId: label.id
            }
          }
        ];
      }
      if (label.type === "PRODUCT_VARIANT" && label.variant) {
        return [
          {
            type: "PRODUCT" as const,
            id: label.variant.id,
            label: `${label.variant.sku} · ${label.variant.product.name}`,
            payload: {
              id: label.variant.id,
              productId: label.variant.productId,
              variantId: label.variant.id,
              sku: label.variant.sku,
              barcode: label.code,
              name: label.variant.name,
              productName: label.variant.product.name,
              labelId: label.id
            }
          }
        ];
      }
      if (label.type === "LOCATION" && label.location) {
        return [
          {
            type: "LOCATION" as const,
            id: label.location.id,
            label: `${label.location.code} · ${label.location.warehouse.code}`,
            payload: {
              id: label.location.id,
              code: label.location.code,
              barcode: label.code,
              warehouseId: label.location.warehouseId,
              warehouseCode: label.location.warehouse.code,
              type: label.location.type,
              status: label.location.status,
              labelId: label.id
            }
          }
        ];
      }
      if (label.type === "ORDER" && label.order) {
        return [
          {
            type: "ORDER" as const,
            id: label.order.id,
            label: label.order.number,
            payload: { id: label.order.id, number: label.order.number, status: label.order.status, labelId: label.id }
          }
        ];
      }
      if (label.type === "WORK" && label.work) {
        return [
          {
            type: "WORK" as const,
            id: label.work.id,
            label: label.work.sourceOrder?.number ?? label.work.id.slice(0, 8),
            payload: {
              id: label.work.id,
              type: label.work.type,
              status: label.work.status,
              warehouseId: label.work.warehouseId,
              warehouseCode: label.work.warehouse.code,
              sourceOrderId: label.work.sourceOrderId,
              sourceOrderNumber: label.work.sourceOrder?.number ?? null,
              labelId: label.id
            }
          }
        ];
      }
      return [];
    }),
    ...locations.map((location) => ({
      type: "LOCATION" as const,
      id: location.id,
      label: `${location.code} · ${location.warehouse.code}`,
      payload: {
        id: location.id,
        code: location.code,
        barcode: location.barcode,
        warehouseId: location.warehouseId,
        warehouseCode: location.warehouse.code,
        type: location.type,
        status: location.status
      }
    })),
    ...products.map((product) => ({
      type: "PRODUCT" as const,
      id: product.id,
      label: `${product.sku} · ${product.name}`,
      payload: {
        id: product.id,
        productId: product.id,
        variantId: null,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name
      }
    })),
    ...variants.map((variant) => ({
      type: "PRODUCT" as const,
      id: variant.id,
      label: `${variant.sku} · ${variant.product.name}`,
      payload: {
        id: variant.id,
        productId: variant.productId,
        variantId: variant.id,
        sku: variant.sku,
        barcode: variant.barcode,
        name: variant.name,
        productName: variant.product.name
      }
    })),
    ...orders.map((order) => ({
      type: "ORDER" as const,
      id: order.id,
      label: order.number,
      payload: { id: order.id, number: order.number, status: order.status }
    })),
    ...workItems.map((work) => ({
      type: "WORK" as const,
      id: work.id,
      label: work.sourceOrder?.number ?? work.id.slice(0, 8),
      payload: {
        id: work.id,
        type: work.type,
        status: work.status,
        warehouseId: work.warehouseId,
        warehouseCode: work.warehouse.code,
        sourceOrderId: work.sourceOrderId,
        sourceOrderNumber: work.sourceOrder?.number ?? null
      }
    }))
  ]);

  return selectBarcodeResolution(candidates, input.expectedType);
}

function dedupeBarcodeCandidates(candidates: BarcodeResolutionCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.type}:${candidate.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
