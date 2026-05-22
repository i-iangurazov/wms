import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { requirePermission } from "@/server/permissions";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";

export async function transferStock(
  context: RequestContext,
  input: {
    fromLocationId: string;
    toLocationId: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    note?: string | null;
    idempotencyKey?: string | null;
  }
) {
  requirePermission(context.role, "transfers.execute");
  return prisma.$transaction((tx) =>
    applyStockMovementInTransaction(tx, context, {
      productId: input.productId,
      variantId: input.variantId,
      type: "TRANSFER",
      quantity: input.quantity,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      note: input.note,
      referenceType: "Transfer",
      idempotencyKey: input.idempotencyKey
    })
  );
}
