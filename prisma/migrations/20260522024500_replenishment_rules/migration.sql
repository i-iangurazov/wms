ALTER TYPE "WarehouseWorkType" ADD VALUE IF NOT EXISTS 'REPLENISHMENT';

CREATE TABLE "replenishment_rules" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "variantKey" TEXT NOT NULL,
  "pickLocationId" TEXT NOT NULL,
  "sourceLocationId" TEXT,
  "sourceZoneId" TEXT,
  "minQty" INTEGER NOT NULL,
  "maxQty" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "replenishment_rules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "warehouse_work" ADD COLUMN "replenishmentRuleId" TEXT;
ALTER TABLE "warehouse_work_lines" ADD COLUMN "completedQuantity" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "replenishment_rules_storeId_pickLocationId_productId_variantKey_key"
  ON "replenishment_rules"("storeId", "pickLocationId", "productId", "variantKey");
CREATE INDEX "replenishment_rules_storeId_warehouseId_active_idx"
  ON "replenishment_rules"("storeId", "warehouseId", "active");
CREATE INDEX "replenishment_rules_sourceLocationId_idx"
  ON "replenishment_rules"("sourceLocationId");
CREATE INDEX "replenishment_rules_sourceZoneId_idx"
  ON "replenishment_rules"("sourceZoneId");
CREATE INDEX "warehouse_work_replenishmentRuleId_idx"
  ON "warehouse_work"("replenishmentRuleId");

ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_pickLocationId_fkey"
  FOREIGN KEY ("pickLocationId") REFERENCES "warehouse_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_sourceLocationId_fkey"
  FOREIGN KEY ("sourceLocationId") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_sourceZoneId_fkey"
  FOREIGN KEY ("sourceZoneId") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warehouse_work"
  ADD CONSTRAINT "warehouse_work_replenishmentRuleId_fkey"
  FOREIGN KEY ("replenishmentRuleId") REFERENCES "replenishment_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_qty_valid" CHECK ("minQty" >= 0 AND "maxQty" > "minQty");
ALTER TABLE "replenishment_rules"
  ADD CONSTRAINT "replenishment_rules_source_required" CHECK ("sourceLocationId" IS NOT NULL OR "sourceZoneId" IS NOT NULL);
