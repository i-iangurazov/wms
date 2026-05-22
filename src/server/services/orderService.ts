import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import { assertOrderNumber, assertOrderQuantity } from "@/server/services/orderRules";
import { variantKey } from "@/server/services/stockMovementEngine";

export async function listCustomerOrders(context: RequestContext) {
  requirePermission(context.role, "picking.execute");
  return prisma.customerOrder.findMany({
    where: { storeId: context.storeId, status: { in: ["OPEN", "ALLOCATED", "PICKING"] } },
    include: { lines: { include: { product: true, variant: true } }, work: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export async function createCustomerOrder(
  context: RequestContext,
  input: {
    number: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
  }
) {
  requirePermission(context.role, "picking.create");
  const number = assertOrderNumber(input.number);
  const quantity = assertOrderQuantity(input.quantity);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customerOrder.findFirst({ where: { storeId: context.storeId, number } });
    if (existing) {
      throw new AppError("Order number already exists.", 409);
    }

    const product = await tx.product.findFirst({
      where: { id: input.productId, storeId: context.storeId, active: true }
    });
    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    const variant = input.variantId
      ? await tx.productVariant.findFirst({
          where: {
            id: input.variantId,
            storeId: context.storeId,
            productId: product.id,
            active: true
          }
        })
      : null;
    if (input.variantId && !variant) {
      throw new AppError("Product variant not found.", 404);
    }

    const order = await tx.customerOrder.create({
      data: {
        storeId: context.storeId,
        number,
        lines: {
          create: {
            productId: product.id,
            variantId: variant?.id ?? null,
            variantKey: variantKey(variant?.id),
            quantity
          }
        }
      },
      include: { lines: true }
    });

    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "customer_order.create",
      entityType: "CustomerOrder",
      entityId: order.id,
      metadata: { number: order.number, lineCount: order.lines.length }
    });

    return order;
  });
}
