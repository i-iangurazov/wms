-- AlterTable
ALTER TABLE "warehouse_locations" ADD COLUMN     "zoneId" TEXT;

-- CreateTable
CREATE TABLE "warehouse_zones" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warehouse_zones_storeId_warehouseId_status_idx" ON "warehouse_zones"("storeId", "warehouseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_zones_warehouseId_code_key" ON "warehouse_zones"("warehouseId", "code");

-- CreateIndex
CREATE INDEX "warehouse_locations_zoneId_idx" ON "warehouse_locations"("zoneId");

-- AddForeignKey
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
