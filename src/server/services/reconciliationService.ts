import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { requirePermission } from "@/server/permissions";

type StockState = {
  onHandQty: number;
  reservedQty: number;
  pickedQty: number;
  damagedQty: number;
  blockedQty: number;
};

const emptyState: StockState = {
  onHandQty: 0,
  reservedQty: 0,
  pickedQty: 0,
  damagedQty: 0,
  blockedQty: 0
};

function key(input: { locationId: string; productId: string; variantKey: string }) {
  return `${input.locationId}:${input.productId}:${input.variantKey}`;
}

function addState(current: StockState, delta: Partial<StockState>) {
  current.onHandQty += delta.onHandQty ?? 0;
  current.reservedQty += delta.reservedQty ?? 0;
  current.pickedQty += delta.pickedQty ?? 0;
  current.damagedQty += delta.damagedQty ?? 0;
  current.blockedQty += delta.blockedQty ?? 0;
}

function sameState(left: StockState, right: StockState) {
  return (
    left.onHandQty === right.onHandQty &&
    left.reservedQty === right.reservedQty &&
    left.pickedQty === right.pickedQty &&
    left.damagedQty === right.damagedQty &&
    left.blockedQty === right.blockedQty
  );
}

export async function getInventoryReconciliation(context: RequestContext) {
  requirePermission(context.role, "WMS_VIEW_AUDIT");
  const [balances, movements] = await Promise.all([
    prisma.inventoryLocationBalance.findMany({
      where: { storeId: context.storeId },
      include: { warehouse: true, location: true, product: true, variant: true }
    }),
    prisma.inventoryMovement.findMany({ where: { storeId: context.storeId } })
  ]);

  const expectedByKey = new Map<string, StockState>();
  for (const movement of movements) {
    if (movement.fromLocationId) {
      const movementKey = key({
        locationId: movement.fromLocationId,
        productId: movement.productId,
        variantKey: movement.variantKey
      });
      const state = expectedByKey.get(movementKey) ?? { ...emptyState };
      addState(state, {
        onHandQty: movement.fromOnHandDelta,
        reservedQty: movement.fromReservedDelta,
        pickedQty: movement.fromPickedDelta,
        damagedQty: movement.fromDamagedDelta,
        blockedQty: movement.fromBlockedDelta
      });
      expectedByKey.set(movementKey, state);
    }
    if (movement.toLocationId) {
      const movementKey = key({
        locationId: movement.toLocationId,
        productId: movement.productId,
        variantKey: movement.variantKey
      });
      const state = expectedByKey.get(movementKey) ?? { ...emptyState };
      addState(state, {
        onHandQty: movement.toOnHandDelta,
        reservedQty: movement.toReservedDelta,
        pickedQty: movement.toPickedDelta,
        damagedQty: movement.toDamagedDelta,
        blockedQty: movement.toBlockedDelta
      });
      expectedByKey.set(movementKey, state);
    }
  }

  const discrepancies = [];
  for (const balance of balances) {
    const balanceKey = key(balance);
    const expected = expectedByKey.get(balanceKey) ?? emptyState;
    const actual = {
      onHandQty: balance.onHandQty,
      reservedQty: balance.reservedQty,
      pickedQty: balance.pickedQty,
      damagedQty: balance.damagedQty,
      blockedQty: balance.blockedQty
    };
    if (!sameState(actual, expected)) {
      discrepancies.push({
        id: balance.id,
        warehouse: balance.warehouse,
        location: balance.location,
        product: balance.product,
        variant: balance.variant,
        actual,
        expected
      });
    }
    expectedByKey.delete(balanceKey);
  }

  return {
    checkedBalances: balances.length,
    checkedMovements: movements.length,
    discrepancies,
    ledgerOnlyKeys: expectedByKey.size
  };
}
