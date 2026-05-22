import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import {
  assertProductName,
  assertProductSku,
  normalizeOptionalBarcode
} from "@/server/services/productRules";

type ProductInput = {
  sku: string;
  name: string;
  barcode?: string | null;
};

type VariantInput = ProductInput & {
  productId: string;
};

const openReceivingLineStatuses = ["OPEN"] as const;
const openReceivingStatuses = ["DRAFT", "RECEIVING"] as const;
const openWorkLineStatuses = ["OPEN", "IN_PROGRESS"] as const;
const openCountStatuses = ["DRAFT", "COUNTING", "PENDING_APPROVAL"] as const;
const openOrderStatuses = ["OPEN", "ALLOCATED", "PICKING"] as const;

async function assertUniqueProductCode(
  tx: Prisma.TransactionClient,
  input: {
    storeId: string;
    value: string | null;
    field: "sku" | "barcode";
    excludeProductId?: string;
    excludeVariantId?: string;
  }
) {
  if (!input.value) {
    return;
  }

  const [product, variant] = await Promise.all([
    tx.product.findFirst({
      where: {
        storeId: input.storeId,
        [input.field]: input.value,
        id: input.excludeProductId ? { not: input.excludeProductId } : undefined
      }
    }),
    tx.productVariant.findFirst({
      where: {
        storeId: input.storeId,
        [input.field]: input.value,
        id: input.excludeVariantId ? { not: input.excludeVariantId } : undefined
      }
    })
  ]);

  if (product || variant) {
    throw new AppError(input.field === "sku" ? "Product SKU already exists." : "Product barcode already exists.", 409);
  }
}

function activeStockWhere(input: { storeId: string; productId: string; variantId?: string | null }) {
  return {
    storeId: input.storeId,
    productId: input.productId,
    variantId: input.variantId === undefined ? undefined : input.variantId,
    OR: [
      { onHandQty: { not: 0 } },
      { reservedQty: { not: 0 } },
      { pickedQty: { not: 0 } },
      { damagedQty: { not: 0 } },
      { blockedQty: { not: 0 } }
    ]
  };
}

async function assertProductCanBeDeactivated(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  input: { productId: string; variantId?: string | null; label: "product" | "variant" }
) {
  const [balance, receivingLine, workLine, countLine, orderLine] = await Promise.all([
    tx.inventoryLocationBalance.findFirst({
      where: activeStockWhere({ storeId: context.storeId, productId: input.productId, variantId: input.variantId }),
      select: { id: true }
    }),
    tx.receivingLine.findFirst({
      where: {
        productId: input.productId,
        variantId: input.variantId === undefined ? undefined : input.variantId,
        status: { in: [...openReceivingLineStatuses] },
        session: { storeId: context.storeId, status: { in: [...openReceivingStatuses] } }
      },
      select: { id: true }
    }),
    tx.warehouseWorkLine.findFirst({
      where: {
        productId: input.productId,
        variantId: input.variantId === undefined ? undefined : input.variantId,
        status: { in: [...openWorkLineStatuses] },
        work: { storeId: context.storeId }
      },
      select: { id: true }
    }),
    tx.cycleCountLine.findFirst({
      where: {
        productId: input.productId,
        variantId: input.variantId === undefined ? undefined : input.variantId,
        session: { storeId: context.storeId, status: { in: [...openCountStatuses] } }
      },
      select: { id: true }
    }),
    tx.customerOrderLine.findFirst({
      where: {
        productId: input.productId,
        variantId: input.variantId === undefined ? undefined : input.variantId,
        order: { storeId: context.storeId, status: { in: [...openOrderStatuses] } }
      },
      select: { id: true }
    })
  ]);

  if (balance || receivingLine || workLine || countLine || orderLine) {
    throw new AppError(
      input.label === "product"
        ? "Cannot deactivate product with stock or open work."
        : "Cannot deactivate product variant with stock or open work.",
      409
    );
  }
}

export async function listProducts(context: RequestContext) {
  requirePermission(context.role, "WMS_VIEW");
  return prisma.product.findMany({
    where: { storeId: context.storeId, active: true },
    include: { variants: { where: { active: true }, orderBy: { sku: "asc" } } },
    orderBy: { sku: "asc" }
  });
}

export async function createProduct(context: RequestContext, input: ProductInput) {
  requirePermission(context.role, "WMS_MANAGE_PRODUCTS");
  const sku = assertProductSku(input.sku);
  const name = assertProductName(input.name);
  const barcode = normalizeOptionalBarcode(input.barcode);

  return prisma.$transaction(async (tx) => {
    await assertUniqueProductCode(tx, { storeId: context.storeId, field: "sku", value: sku });
    await assertUniqueProductCode(tx, { storeId: context.storeId, field: "barcode", value: barcode });

    const product = await tx.product.create({
      data: {
        storeId: context.storeId,
        sku,
        name,
        barcode
      }
    });

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      metadata: { sku: product.sku, barcode: product.barcode }
    });

    return product;
  });
}

export async function updateProduct(context: RequestContext, id: string, input: ProductInput) {
  requirePermission(context.role, "WMS_MANAGE_PRODUCTS");
  const sku = assertProductSku(input.sku);
  const name = assertProductName(input.name);
  const barcode = normalizeOptionalBarcode(input.barcode);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Product not found.", 404);
    }
    await assertUniqueProductCode(tx, { storeId: context.storeId, field: "sku", value: sku, excludeProductId: id });
    await assertUniqueProductCode(tx, { storeId: context.storeId, field: "barcode", value: barcode, excludeProductId: id });

    const product = await tx.product.update({
      where: { id },
      data: { sku, name, barcode }
    });

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "product.update",
      entityType: "Product",
      entityId: product.id,
      metadata: { sku: product.sku, barcode: product.barcode }
    });

    return product;
  });
}

export async function deactivateProduct(context: RequestContext, id: string) {
  requirePermission(context.role, "WMS_MANAGE_PRODUCTS");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Product not found.", 404);
    }
    await assertProductCanBeDeactivated(tx, context, { productId: id, label: "product" });

    const product = await tx.product.update({ where: { id }, data: { active: false } });
    await tx.productVariant.updateMany({ where: { storeId: context.storeId, productId: id }, data: { active: false } });

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "product.deactivate",
      entityType: "Product",
      entityId: product.id,
      metadata: { sku: product.sku }
    });

    return product;
  });
}

export async function createProductVariant(context: RequestContext, input: VariantInput) {
  requirePermission(context.role, "WMS_MANAGE_PRODUCTS");
  const sku = assertProductSku(input.sku);
  const name = assertProductName(input.name);
  const barcode = normalizeOptionalBarcode(input.barcode);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({ where: { id: input.productId, storeId: context.storeId, active: true } });
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
    await assertUniqueProductCode(tx, { storeId: context.storeId, field: "sku", value: sku });
    await assertUniqueProductCode(tx, { storeId: context.storeId, field: "barcode", value: barcode });

    const variant = await tx.productVariant.create({
      data: {
        storeId: context.storeId,
        productId: product.id,
        sku,
        name,
        barcode
      }
    });

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "product_variant.create",
      entityType: "ProductVariant",
      entityId: variant.id,
      metadata: { productId: product.id, sku: variant.sku, barcode: variant.barcode }
    });

    return variant;
  });
}

export async function updateProductVariant(context: RequestContext, id: string, input: ProductInput) {
  requirePermission(context.role, "WMS_MANAGE_PRODUCTS");
  const sku = assertProductSku(input.sku);
  const name = assertProductName(input.name);
  const barcode = normalizeOptionalBarcode(input.barcode);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.productVariant.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Product variant not found.", 404);
    }
    await assertUniqueProductCode(tx, { storeId: context.storeId, field: "sku", value: sku, excludeVariantId: id });
    await assertUniqueProductCode(tx, { storeId: context.storeId, field: "barcode", value: barcode, excludeVariantId: id });

    const variant = await tx.productVariant.update({
      where: { id },
      data: { sku, name, barcode }
    });

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "product_variant.update",
      entityType: "ProductVariant",
      entityId: variant.id,
      metadata: { sku: variant.sku, barcode: variant.barcode }
    });

    return variant;
  });
}

export async function deactivateProductVariant(context: RequestContext, id: string) {
  requirePermission(context.role, "WMS_MANAGE_PRODUCTS");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.productVariant.findFirst({ where: { id, storeId: context.storeId } });
    if (!existing) {
      throw new AppError("Product variant not found.", 404);
    }
    await assertProductCanBeDeactivated(tx, context, {
      productId: existing.productId,
      variantId: existing.id,
      label: "variant"
    });
    const variant = await tx.productVariant.update({ where: { id }, data: { active: false } });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "product_variant.deactivate",
      entityType: "ProductVariant",
      entityId: variant.id,
      metadata: { sku: variant.sku }
    });
    return variant;
  });
}
