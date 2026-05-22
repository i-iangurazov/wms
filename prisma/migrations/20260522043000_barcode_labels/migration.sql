CREATE TYPE "BarcodeLabelEntityType" AS ENUM ('PRODUCT', 'PRODUCT_VARIANT', 'LOCATION', 'ORDER', 'WORK');

CREATE TABLE "barcode_labels" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" "BarcodeLabelEntityType" NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  "locationId" TEXT,
  "orderId" TEXT,
  "workId" TEXT,
  "note" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "barcode_labels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "barcode_labels_storeId_code_key" ON "barcode_labels"("storeId", "code");
CREATE INDEX "barcode_labels_storeId_type_active_idx" ON "barcode_labels"("storeId", "type", "active");
CREATE INDEX "barcode_labels_productId_idx" ON "barcode_labels"("productId");
CREATE INDEX "barcode_labels_variantId_idx" ON "barcode_labels"("variantId");
CREATE INDEX "barcode_labels_locationId_idx" ON "barcode_labels"("locationId");
CREATE INDEX "barcode_labels_orderId_idx" ON "barcode_labels"("orderId");
CREATE INDEX "barcode_labels_workId_idx" ON "barcode_labels"("workId");

ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "warehouse_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_workId_fkey"
  FOREIGN KEY ("workId") REFERENCES "warehouse_work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
