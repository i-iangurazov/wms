CREATE TYPE "InventoryReservationStatus" AS ENUM (
  'RESERVED',
  'RELEASED',
  'PICKING',
  'PICKED',
  'SHORT',
  'CANCELLED'
);

CREATE TABLE "inventory_reservations" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "variantKey" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "InventoryReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "createdById" TEXT NOT NULL,
  "releasedAt" TIMESTAMP(3),
  "pickedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_reservations_storeId_status_idx"
  ON "inventory_reservations"("storeId", "status");

CREATE INDEX "inventory_reservations_storeId_productId_variantKey_idx"
  ON "inventory_reservations"("storeId", "productId", "variantKey");

CREATE INDEX "inventory_reservations_orderLineId_status_idx"
  ON "inventory_reservations"("orderLineId", "status");

CREATE INDEX "inventory_reservations_locationId_status_idx"
  ON "inventory_reservations"("locationId", "status");

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "warehouse_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_orderLineId_fkey"
  FOREIGN KEY ("orderLineId") REFERENCES "customer_order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
