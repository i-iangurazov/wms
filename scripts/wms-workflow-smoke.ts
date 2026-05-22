import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { RequestContext } from "@/server/auth";

async function main() {
  const prisma = new PrismaClient({
    datasources: process.env.DATABASE_URL ? { db: { url: process.env.DATABASE_URL } } : undefined
  });

  await prisma.$connect();
  (globalThis as unknown as { prisma?: PrismaClient }).prisma = prisma;

  const { createProduct, deactivateProduct, listProducts, updateProduct } = await import(
    "@/server/services/productService"
  );
  const { createWarehouse, deactivateWarehouse } = await import("@/server/services/warehouseService");
  const { createLocation, createZone, deactivateLocation } = await import("@/server/services/locationService");
  const { addReceivingLine, completeReceivingSession, createReceivingSession, receiveLine } = await import(
    "@/server/services/receivingService"
  );
  const { putAwayStock } = await import("@/server/services/putawayService");
  const { transferStock } = await import("@/server/services/transferService");
  const { adjustStock } = await import("@/server/services/adjustmentService");
  const { approveCycleCount, createCycleCount, submitCycleCount, updateCycleCountLine } = await import(
    "@/server/services/cycleCountService"
  );
  const { createCustomerOrder } = await import("@/server/services/orderService");
  const { allocateOrderStock, releaseOrderReservations } = await import("@/server/services/reservationService");
  const { confirmPickLine, createPickWorkFromOrder } = await import("@/server/services/pickingService");
  const { availableQuantity, variantKey } = await import("@/server/services/stockMovementEngine");
  const { listAuditLogs } = await import("@/server/services/auditService");
  const { addStoreUser, listStoreUsers, removeStoreUser, updateStoreUserRole } = await import(
    "@/server/services/userService"
  );
  const { createOrganization, listCurrentUserOrganizations } = await import(
    "@/server/services/organizationService"
  );
  const { getInventoryReconciliation } = await import("@/server/services/reconciliationService");
  const {
    confirmReplenishmentLine,
    createReplenishmentRule,
    generateReplenishmentWork,
    listReplenishment
  } = await import("@/server/services/replenishmentService");
  const { confirmPackLine, createPackWorkFromOrder, markOrderReadyToShip } = await import(
    "@/server/services/packingService"
  );
  const { createLocationDirective, createWorkTemplate, listWarehouseRules } = await import(
    "@/server/services/warehouseRuleService"
  );
  const { hashPassword } = await import("@/server/password");
  const { authenticateWithPassword, destroySession, getSessionContext, switchSessionOrganization } = await import(
    "@/server/session"
  );

  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const emailSuffix = suffix.toLowerCase();
  const adminPassword = `Integration${suffix}!`;
  const storeIds: string[] = [];

  try {
    const store = await prisma.store.create({
      data: { code: `IT-${suffix}`, name: `Integration ${suffix}` }
    });
    storeIds.push(store.id);
    const user = await prisma.user.create({
      data: {
        email: `it-${emailSuffix}@example.com`,
        name: "Integration Admin",
        role: "OWNER",
        passwordHash: await hashPassword(adminPassword)
      }
    });
    await prisma.storeUser.create({
      data: { storeId: store.id, userId: user.id, role: "OWNER" }
    });
    const context: RequestContext = { user, storeId: store.id, role: "OWNER" };
    const otherStore = await prisma.store.create({
      data: { code: `IT-OTHER-${suffix}`, name: `Integration Other ${suffix}` }
    });
    storeIds.push(otherStore.id);
    const otherUser = await prisma.user.create({
      data: {
        email: `it-other-${emailSuffix}@example.com`,
        name: "Other Integration Admin",
        role: "OWNER",
        passwordHash: await hashPassword(`${adminPassword}Other`)
      }
    });
    await prisma.storeUser.create({
      data: { storeId: otherStore.id, userId: otherUser.id, role: "OWNER" }
    });
    const otherContext: RequestContext = { user: otherUser, storeId: otherStore.id, role: "OWNER" };

    const auth = await authenticateWithPassword({ email: user.email, password: adminPassword });
    assert.equal(auth.membership.storeId, store.id);
    const sessionContext = await getSessionContext(auth.token);
    assert.equal(sessionContext?.user.id, user.id);
    assert.equal(sessionContext?.storeId, store.id);
    await assert.rejects(
      () => authenticateWithPassword({ email: user.email, password: "WrongPassword123!" }),
      /Неверный email или пароль/
    );
    await assert.rejects(
      () => switchSessionOrganization({ token: auth.token, userId: user.id, storeId: otherStore.id }),
      /Нет доступа/
    );
    await destroySession(auth.token);
    assert.equal(await getSessionContext(auth.token), null);

    const warehouse = await createWarehouse(context, { code: `WH-${suffix}`, name: "Integration Warehouse" });
    const storageZone = await createZone(context, {
      warehouseId: warehouse.id,
      code: `ZONE-${suffix}`,
      name: "Integration Storage Zone"
    });
    const receiving = await createLocation(context, {
      warehouseId: warehouse.id,
      code: `RECV-${suffix}`,
      barcode: `LOC-RECV-${suffix}`,
      type: "RECEIVING",
      status: "ACTIVE",
      isReceivable: true,
      isPickable: false,
      isSellable: false
    });
    const picking = await createLocation(context, {
      warehouseId: warehouse.id,
      code: `PICK-${suffix}`,
      barcode: `LOC-PICK-${suffix}`,
      type: "PICKING",
      status: "ACTIVE",
      isReceivable: false,
      isPickable: true,
      isSellable: true
    });
    const storage = await createLocation(context, {
      warehouseId: warehouse.id,
      zoneId: storageZone.id,
      code: `STOR-${suffix}`,
      barcode: `LOC-STOR-${suffix}`,
      type: "STORAGE",
      status: "ACTIVE",
      isReceivable: false,
      isPickable: false,
      isSellable: false
    });
    await assert.rejects(
      () => deactivateWarehouse(context, warehouse.id),
      /Cannot deactivate warehouse with active locations/
    );
    await createWorkTemplate(context, {
      warehouseId: warehouse.id,
      type: "PICK",
      name: "Integration Pick Template",
      priority: 10
    });
    await createLocationDirective(context, {
      warehouseId: warehouse.id,
      type: "DEFAULT_RECEIVING_LOCATION",
      name: "Integration Default Receiving",
      locationId: receiving.id,
      priority: 1
    });
    await createLocationDirective(context, {
      warehouseId: warehouse.id,
      type: "PREFERRED_PUTAWAY_ZONE",
      name: "Integration Putaway Zone",
      zoneId: storageZone.id,
      priority: 10
    });
    await createLocationDirective(context, {
      warehouseId: warehouse.id,
      type: "PICKABLE_LOCATION",
      name: "Integration Pick Source",
      locationId: picking.id,
      priority: 1
    });
    const warehouseRules = await listWarehouseRules(context);
    assert.ok(warehouseRules.workTemplates.some((template) => template.name === "Integration Pick Template"));
    assert.ok(warehouseRules.locationDirectives.some((directive) => directive.name === "Integration Default Receiving"));

    const product = await createProduct(context, {
      sku: `SKU-${suffix}`,
      name: "Integration Product",
      barcode: `BAR-${suffix}`
    });
    const otherProducts = await listProducts(otherContext);
    assert.equal(otherProducts.some((row) => row.id === product.id), false);
    await assert.rejects(
      () =>
        updateProduct(otherContext, product.id, {
          sku: `SKU-OTHER-${suffix}`,
          name: "Cross Tenant Product",
          barcode: `BAR-OTHER-${suffix}`
        }),
      /Product not found/
    );
    await assert.rejects(
      () =>
        createLocation(otherContext, {
          warehouseId: warehouse.id,
          code: `XLOC-${suffix}`,
          barcode: `XLOC-${suffix}`,
          type: "STORAGE"
        }),
      /Warehouse not found/
    );
    const workerMembership = await addStoreUser(context, {
      name: "Integration Worker",
      email: `worker-${emailSuffix}@example.com`,
      role: "WAREHOUSE_WORKER",
      initialPassword: `Worker${suffix}!`
    });
    const users = await listStoreUsers(context);
    assert.ok(users.some((row) => row.id === workerMembership.id));
    const managerMembership = await updateStoreUserRole(context, workerMembership.id, { role: "WAREHOUSE_MANAGER" });
    await assert.rejects(
      () =>
        listStoreUsers({
          user: managerMembership.user,
          storeId: context.storeId,
          role: "WAREHOUSE_MANAGER"
        }),
      /доступ/
    );
    await removeStoreUser(context, managerMembership.id);
    const createdOrganization = await createOrganization(context, {
      name: `Integration Child ${suffix}`,
      code: `IT-CHILD-${suffix}`
    });
    storeIds.push(createdOrganization.store.id);
    const organizations = await listCurrentUserOrganizations(context);
    assert.ok(organizations.some((row) => row.storeId === createdOrganization.store.id));

    const receivingSession = await createReceivingSession(context, {
      warehouseId: warehouse.id,
      reference: "IT-RECEIVE"
    });
    const receivingLine = await addReceivingLine(context, {
      sessionId: receivingSession.id,
      productId: product.id,
      expectedQty: 10
    });
    const receiveIdempotencyKey = `receive-${suffix}`;
    await receiveLine(context, { lineId: receivingLine.id, quantity: 10, idempotencyKey: receiveIdempotencyKey });
    await receiveLine(context, { lineId: receivingLine.id, quantity: 10, idempotencyKey: receiveIdempotencyKey });
    await assert.rejects(
      () => receiveLine(context, { lineId: receivingLine.id, quantity: 9, idempotencyKey: receiveIdempotencyKey }),
      /different stock command/
    );
    await assert.rejects(
      () => deactivateLocation(context, receiving.id),
      /Cannot deactivate location with stock or open work/
    );
    await assert.rejects(
      () => deactivateProduct(context, product.id),
      /Cannot deactivate product with stock or open work/
    );
    await completeReceivingSession(context, receivingSession.id);

    await putAwayStock(context, {
      fromLocationId: receiving.id,
      toLocationId: picking.id,
      productId: product.id,
      quantity: 7
    });
    await assert.rejects(
      () =>
        putAwayStock(otherContext, {
          fromLocationId: receiving.id,
          toLocationId: picking.id,
          productId: product.id,
          quantity: 1
        }),
      /not found|does not belong/
    );

    const transferIdempotencyKey = `transfer-${suffix}`;
    await transferStock(context, {
      fromLocationId: picking.id,
      toLocationId: storage.id,
      productId: product.id,
      quantity: 2,
      idempotencyKey: transferIdempotencyKey
    });
    await assert.rejects(
      () =>
        transferStock(context, {
          fromLocationId: picking.id,
          toLocationId: storage.id,
          productId: product.id,
          quantity: 1,
          idempotencyKey: transferIdempotencyKey
        }),
      /different stock command/
    );
    await transferStock(context, {
      fromLocationId: picking.id,
      toLocationId: storage.id,
      productId: product.id,
      quantity: 2,
      idempotencyKey: transferIdempotencyKey
    });

    await adjustStock(context, {
      locationId: picking.id,
      productId: product.id,
      quantityDelta: 1,
      reason: "DAMAGED",
      targetState: "DAMAGED",
      note: "Integration damaged stock"
    });

    const reservationOrder = await createCustomerOrder(context, {
      number: `RESERVE-${suffix}`,
      productId: product.id,
      quantity: 1
    });
    const reservationKey = `reserve-${suffix}`;
    const reservations = await allocateOrderStock(context, {
      orderId: reservationOrder.id,
      warehouseId: warehouse.id,
      idempotencyKey: reservationKey
    });
    assert.equal(reservations.length, 1);
    const replayedReservations = await allocateOrderStock(context, {
      orderId: reservationOrder.id,
      warehouseId: warehouse.id,
      idempotencyKey: reservationKey
    });
    assert.equal(replayedReservations.length, 1);
    await assert.rejects(
      () => allocateOrderStock(otherContext, { orderId: reservationOrder.id, warehouseId: warehouse.id }),
      /Order not found/
    );
    const reservedBalance = await prisma.inventoryLocationBalance.findUniqueOrThrow({
      where: {
        storeId_locationId_productId_variantKey: {
          storeId: store.id,
          locationId: picking.id,
          productId: product.id,
          variantKey: variantKey(null)
        }
      }
    });
    assert.equal(reservedBalance.reservedQty, 1);
    assert.equal(availableQuantity(reservedBalance), 3);
    const releasedCount = await releaseOrderReservations(context, {
      orderId: reservationOrder.id,
      idempotencyKey: `release-${suffix}`
    });
    assert.equal(releasedCount, 1);
    const replayedReleaseCount = await releaseOrderReservations(context, {
      orderId: reservationOrder.id,
      idempotencyKey: `release-${suffix}`
    });
    assert.equal(replayedReleaseCount, 0);

    const count = await createCycleCount(context, { warehouseId: warehouse.id, locationId: storage.id });
    const countLine = await prisma.cycleCountLine.findFirstOrThrow({
      where: { sessionId: count.id, productId: product.id }
    });
    assert.equal(countLine.expectedQty, 2);
    await updateCycleCountLine(context, { lineId: countLine.id, countedQty: 1 });
    await submitCycleCount(context, count.id);
    await approveCycleCount(context, count.id);

    const order = await createCustomerOrder(context, {
      number: `ORDER-${suffix}`,
      productId: product.id,
      quantity: 4
    });
    const work = await createPickWorkFromOrder(context, { orderId: order.id, warehouseId: warehouse.id });
    await assert.rejects(
      () => createPickWorkFromOrder(otherContext, { orderId: order.id, warehouseId: warehouse.id }),
      /not found/
    );
    const pickLine = await prisma.warehouseWorkLine.findFirstOrThrow({
      where: { workId: work.id },
      include: { sourceLocation: true, product: true }
    });
    assert.equal(pickLine.sourceLocationId, picking.id);
    const pickIdempotencyKey = `pick-${suffix}`;
    await confirmPickLine(context, {
      lineId: pickLine.id,
      locationScan: pickLine.sourceLocation.code,
      productScan: pickLine.product.sku,
      quantity: 4,
      idempotencyKey: pickIdempotencyKey
    });
    await confirmPickLine(context, {
      lineId: pickLine.id,
      locationScan: pickLine.sourceLocation.code,
      productScan: pickLine.product.sku,
      quantity: 4,
      idempotencyKey: pickIdempotencyKey
    });
    await assert.rejects(
      () =>
        confirmPickLine(context, {
          lineId: pickLine.id,
          locationScan: pickLine.sourceLocation.code,
          productScan: pickLine.product.sku,
          quantity: 3,
          idempotencyKey: pickIdempotencyKey
        }),
      /different stock command/
    );

    const replenishmentRule = await createReplenishmentRule(context, {
      warehouseId: warehouse.id,
      productId: product.id,
      pickLocationId: picking.id,
      sourceLocationId: storage.id,
      minQty: 1,
      maxQty: 2
    });
    const replenishment = await listReplenishment(context);
    assert.ok(replenishment.rules.some((rule) => rule.id === replenishmentRule.id));
    const replenishmentWork = await generateReplenishmentWork(context, replenishmentRule.id);
    const replenishmentLine = await prisma.warehouseWorkLine.findFirstOrThrow({
      where: { workId: replenishmentWork.id },
      include: { sourceLocation: true, destinationLocation: true, product: true }
    });
    await confirmReplenishmentLine(context, {
      lineId: replenishmentLine.id,
      sourceScan: replenishmentLine.sourceLocation.code,
      destinationScan: replenishmentLine.destinationLocation?.code ?? "",
      productScan: replenishmentLine.product.sku,
      quantity: replenishmentLine.quantity
    });
    const packWork = await createPackWorkFromOrder(context, { orderId: order.id, warehouseId: warehouse.id });
    const packLine = await prisma.warehouseWorkLine.findFirstOrThrow({
      where: { workId: packWork.id },
      include: { product: true }
    });
    await confirmPackLine(context, {
      lineId: packLine.id,
      productScan: packLine.product.sku,
      quantity: packLine.quantity
    });
    await markOrderReadyToShip(context, order.id);
    const packedOrder = await prisma.customerOrder.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(packedOrder.status, "READY_TO_SHIP");

    const pickingBalance = await prisma.inventoryLocationBalance.findUniqueOrThrow({
      where: {
        storeId_locationId_productId_variantKey: {
          storeId: store.id,
          locationId: picking.id,
          productId: product.id,
          variantKey: variantKey(null)
        }
      }
    });
    assert.equal(pickingBalance.onHandQty, 2);
    assert.equal(pickingBalance.reservedQty, 0);
    assert.equal(pickingBalance.damagedQty, 1);
    assert.equal(availableQuantity(pickingBalance), 1);

    const storageBalance = await prisma.inventoryLocationBalance.findUniqueOrThrow({
      where: {
        storeId_locationId_productId_variantKey: {
          storeId: store.id,
          locationId: storage.id,
          productId: product.id,
          variantKey: variantKey(null)
        }
      }
    });
    assert.equal(storageBalance.onHandQty, 0);

    const movements = await prisma.inventoryMovement.findMany({
      where: { storeId: store.id, productId: product.id },
      orderBy: { createdAt: "asc" }
    });
    assert.deepEqual(
      movements.map((movement) => movement.type),
      [
        "RECEIVE",
        "PUTAWAY",
        "TRANSFER",
        "ADJUSTMENT",
        "RESERVE",
        "RELEASE_RESERVATION",
        "CYCLE_COUNT_CORRECTION",
        "PICK",
        "TRANSFER"
      ]
    );

    const auditLogs = await listAuditLogs(context);
    assert.ok(auditLogs.length > 0);
    assert.ok(auditLogs.some((log) => log.action === "inventory_movement.create"));
    const otherAuditLogs = await listAuditLogs(otherContext);
    assert.equal(otherAuditLogs.some((log) => log.storeId === store.id), false);
    const reconciliation = await getInventoryReconciliation(context);
    assert.equal(reconciliation.discrepancies.length, 0);
    assert.equal(reconciliation.ledgerOnlyKeys, 0);

    console.log("WMS workflow smoke passed.");
  } finally {
    for (const id of storeIds.reverse()) {
      await prisma.store.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
