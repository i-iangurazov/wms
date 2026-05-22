import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";
import { availableQuantity, variantKey } from "@/server/services/stockMovementEngine";
import { applyStockMovementInTransaction } from "@/server/services/stockMovementService";
import {
  assertPutAwayDestination,
  assertQuantityWithinAvailable,
  assertReceivingLocation
} from "@/server/services/receivingRules";

export async function putAwayStock(
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
  requirePermission(context.role, "WMS_MOVE_STOCK");
  return prisma.$transaction(async (tx) => {
    const [fromLocation, toLocation, balance] = await Promise.all([
      tx.warehouseLocation.findFirst({ where: { id: input.fromLocationId, storeId: context.storeId } }),
      tx.warehouseLocation.findFirst({ where: { id: input.toLocationId, storeId: context.storeId } }),
      tx.inventoryLocationBalance.findUnique({
        where: {
          storeId_locationId_productId_variantKey: {
            storeId: context.storeId,
            locationId: input.fromLocationId,
            productId: input.productId,
            variantKey: variantKey(input.variantId)
          }
        }
      })
    ]);
    if (!fromLocation) {
      throw new AppError("Source receiving location not found.", 404);
    }
    if (!toLocation) {
      throw new AppError("Destination location not found.", 404);
    }
    assertReceivingLocation(fromLocation);
    assertPutAwayDestination(toLocation);
    assertQuantityWithinAvailable(input.quantity, balance ? availableQuantity(balance) : 0);

    const movement = await applyStockMovementInTransaction(tx, context, {
      productId: input.productId,
      variantId: input.variantId,
      type: "PUTAWAY",
      quantity: input.quantity,
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      note: input.note,
      referenceType: "PutAway",
      idempotencyKey: input.idempotencyKey
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "putaway.create",
      entityType: "InventoryMovement",
      entityId: movement.id,
      metadata: { quantity: input.quantity }
    });
    return movement;
  });
}
