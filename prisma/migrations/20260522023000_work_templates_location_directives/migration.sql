CREATE TYPE "WarehouseWorkTemplateType" AS ENUM (
  'RECEIVE',
  'PUTAWAY',
  'TRANSFER',
  'REPLENISHMENT',
  'PICK',
  'PACK'
);

CREATE TYPE "WarehouseLocationDirectiveType" AS ENUM (
  'DEFAULT_RECEIVING_LOCATION',
  'PREFERRED_PUTAWAY_ZONE',
  'PICKABLE_LOCATION',
  'DAMAGED_LOCATION',
  'REPLENISHMENT_SOURCE_ZONE',
  'REPLENISHMENT_DESTINATION_ZONE'
);

CREATE TABLE "warehouse_work_templates" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "type" "WarehouseWorkTemplateType" NOT NULL,
  "name" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "warehouse_work_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warehouse_location_directives" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "type" "WarehouseLocationDirectiveType" NOT NULL,
  "name" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "zoneId" TEXT,
  "locationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "warehouse_location_directives_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "warehouse_work_templates_storeId_warehouseId_type_name_key"
  ON "warehouse_work_templates"("storeId", "warehouseId", "type", "name");
CREATE INDEX "warehouse_work_templates_storeId_warehouseId_type_active_idx"
  ON "warehouse_work_templates"("storeId", "warehouseId", "type", "active");

CREATE INDEX "warehouse_location_directives_storeId_warehouseId_type_active_idx"
  ON "warehouse_location_directives"("storeId", "warehouseId", "type", "active");
CREATE INDEX "warehouse_location_directives_zoneId_idx"
  ON "warehouse_location_directives"("zoneId");
CREATE INDEX "warehouse_location_directives_locationId_idx"
  ON "warehouse_location_directives"("locationId");

ALTER TABLE "warehouse_work_templates"
  ADD CONSTRAINT "warehouse_work_templates_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_work_templates"
  ADD CONSTRAINT "warehouse_work_templates_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "warehouse_location_directives"
  ADD CONSTRAINT "warehouse_location_directives_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_location_directives"
  ADD CONSTRAINT "warehouse_location_directives_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_location_directives"
  ADD CONSTRAINT "warehouse_location_directives_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "warehouse_location_directives"
  ADD CONSTRAINT "warehouse_location_directives_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "warehouse_work_templates"
  ADD CONSTRAINT "warehouse_work_templates_priority_non_negative" CHECK ("priority" >= 0);
ALTER TABLE "warehouse_location_directives"
  ADD CONSTRAINT "warehouse_location_directives_priority_non_negative" CHECK ("priority" >= 0);
ALTER TABLE "warehouse_location_directives"
  ADD CONSTRAINT "warehouse_location_directives_target_required"
  CHECK ("zoneId" IS NOT NULL OR "locationId" IS NOT NULL);
