-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'STAFF', 'CASHIER');

-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('RECEIVING', 'STORAGE', 'PICKING', 'PACKING', 'SHIPPING', 'RETURNS', 'DAMAGED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIVE', 'PUTAWAY', 'TRANSFER', 'ADJUSTMENT', 'CYCLE_COUNT_CORRECTION', 'PICK');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('DAMAGED', 'LOST', 'FOUND', 'COUNT_CORRECTION', 'MANUAL_CORRECTION', 'EXPIRED', 'RETURNED_TO_STOCK');

-- CreateEnum
CREATE TYPE "ReceivingStatus" AS ENUM ('DRAFT', 'RECEIVING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceivingLineStatus" AS ENUM ('OPEN', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseWorkType" AS ENUM ('PICK', 'PUTAWAY');

-- CreateEnum
CREATE TYPE "WarehouseWorkStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarehouseWorkLineStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CycleCountStatus" AS ENUM ('DRAFT', 'COUNTING', 'PENDING_APPROVAL', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'ALLOCATED', 'PICKING', 'PICKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_users" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_locations" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "type" "LocationType" NOT NULL,
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPickable" BOOLEAN NOT NULL DEFAULT false,
    "isReceivable" BOOLEAN NOT NULL DEFAULT false,
    "isSellable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_location_balances" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_location_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantKey" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "reason" "AdjustmentReason",
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receiving_sessions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "receivingLocationId" TEXT NOT NULL,
    "reference" TEXT,
    "status" "ReceivingStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "receiving_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receiving_lines" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantKey" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL DEFAULT 0,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "status" "ReceivingLineStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receiving_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_work" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" "WarehouseWorkType" NOT NULL,
    "status" "WarehouseWorkStatus" NOT NULL DEFAULT 'OPEN',
    "sourceOrderId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "warehouse_work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_work_lines" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "sourceLocationId" TEXT NOT NULL,
    "destinationLocationId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "WarehouseWorkLineStatus" NOT NULL DEFAULT 'OPEN',
    "locationConfirmedAt" TIMESTAMP(3),
    "productConfirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_work_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_count_sessions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" "CycleCountStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "cycle_count_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_count_lines" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantKey" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "countedQty" INTEGER,
    "difference" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_count_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_orders" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_order_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "variantKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");

-- CreateIndex
CREATE INDEX "store_users_userId_idx" ON "store_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "store_users_storeId_userId_key" ON "store_users"("storeId", "userId");

-- CreateIndex
CREATE INDEX "products_storeId_name_idx" ON "products"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_storeId_sku_key" ON "products"("storeId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_storeId_barcode_key" ON "products"("storeId", "barcode");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_storeId_sku_key" ON "product_variants"("storeId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_storeId_barcode_key" ON "product_variants"("storeId", "barcode");

-- CreateIndex
CREATE INDEX "warehouses_storeId_status_idx" ON "warehouses"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_storeId_code_key" ON "warehouses"("storeId", "code");

-- CreateIndex
CREATE INDEX "warehouse_locations_storeId_type_status_idx" ON "warehouse_locations"("storeId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_locations_warehouseId_code_key" ON "warehouse_locations"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_locations_storeId_barcode_key" ON "warehouse_locations"("storeId", "barcode");

-- CreateIndex
CREATE INDEX "inventory_location_balances_storeId_warehouseId_idx" ON "inventory_location_balances"("storeId", "warehouseId");

-- CreateIndex
CREATE INDEX "inventory_location_balances_storeId_productId_variantKey_idx" ON "inventory_location_balances"("storeId", "productId", "variantKey");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_location_balances_storeId_locationId_productId_va_key" ON "inventory_location_balances"("storeId", "locationId", "productId", "variantKey");

-- CreateIndex
CREATE INDEX "inventory_movements_storeId_createdAt_idx" ON "inventory_movements"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_storeId_productId_variantKey_idx" ON "inventory_movements"("storeId", "productId", "variantKey");

-- CreateIndex
CREATE INDEX "inventory_movements_storeId_type_idx" ON "inventory_movements"("storeId", "type");

-- CreateIndex
CREATE INDEX "receiving_sessions_storeId_status_idx" ON "receiving_sessions"("storeId", "status");

-- CreateIndex
CREATE INDEX "receiving_lines_sessionId_idx" ON "receiving_lines"("sessionId");

-- CreateIndex
CREATE INDEX "warehouse_work_storeId_type_status_idx" ON "warehouse_work"("storeId", "type", "status");

-- CreateIndex
CREATE INDEX "warehouse_work_lines_workId_status_idx" ON "warehouse_work_lines"("workId", "status");

-- CreateIndex
CREATE INDEX "cycle_count_sessions_storeId_status_idx" ON "cycle_count_sessions"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_count_lines_sessionId_productId_variantKey_key" ON "cycle_count_lines"("sessionId", "productId", "variantKey");

-- CreateIndex
CREATE INDEX "customer_orders_storeId_status_idx" ON "customer_orders"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_orders_storeId_number_key" ON "customer_orders"("storeId", "number");

-- CreateIndex
CREATE INDEX "customer_order_lines_orderId_idx" ON "customer_order_lines"("orderId");

-- CreateIndex
CREATE INDEX "audit_logs_storeId_createdAt_idx" ON "audit_logs"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "store_users" ADD CONSTRAINT "store_users_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_users" ADD CONSTRAINT "store_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_location_balances" ADD CONSTRAINT "inventory_location_balances_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_location_balances" ADD CONSTRAINT "inventory_location_balances_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_location_balances" ADD CONSTRAINT "inventory_location_balances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "warehouse_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_location_balances" ADD CONSTRAINT "inventory_location_balances_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_location_balances" ADD CONSTRAINT "inventory_location_balances_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_sessions" ADD CONSTRAINT "receiving_sessions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_sessions" ADD CONSTRAINT "receiving_sessions_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_sessions" ADD CONSTRAINT "receiving_sessions_receivingLocationId_fkey" FOREIGN KEY ("receivingLocationId") REFERENCES "warehouse_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_sessions" ADD CONSTRAINT "receiving_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_lines" ADD CONSTRAINT "receiving_lines_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "receiving_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_lines" ADD CONSTRAINT "receiving_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_lines" ADD CONSTRAINT "receiving_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work" ADD CONSTRAINT "warehouse_work_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work" ADD CONSTRAINT "warehouse_work_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work" ADD CONSTRAINT "warehouse_work_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "customer_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work" ADD CONSTRAINT "warehouse_work_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work" ADD CONSTRAINT "warehouse_work_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work_lines" ADD CONSTRAINT "warehouse_work_lines_workId_fkey" FOREIGN KEY ("workId") REFERENCES "warehouse_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work_lines" ADD CONSTRAINT "warehouse_work_lines_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "warehouse_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work_lines" ADD CONSTRAINT "warehouse_work_lines_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "warehouse_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work_lines" ADD CONSTRAINT "warehouse_work_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_work_lines" ADD CONSTRAINT "warehouse_work_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_sessions" ADD CONSTRAINT "cycle_count_sessions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_sessions" ADD CONSTRAINT "cycle_count_sessions_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_sessions" ADD CONSTRAINT "cycle_count_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "warehouse_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_sessions" ADD CONSTRAINT "cycle_count_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_sessions" ADD CONSTRAINT "cycle_count_sessions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cycle_count_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_count_lines" ADD CONSTRAINT "cycle_count_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_order_lines" ADD CONSTRAINT "customer_order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_order_lines" ADD CONSTRAINT "customer_order_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_order_lines" ADD CONSTRAINT "customer_order_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
