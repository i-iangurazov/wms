CREATE TABLE "stock_commands" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "operation" "InventoryMovementType" NOT NULL,
  "movementId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stock_commands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_commands_storeId_idempotencyKey_key" ON "stock_commands"("storeId", "idempotencyKey");
CREATE UNIQUE INDEX "stock_commands_movementId_key" ON "stock_commands"("movementId");
CREATE INDEX "stock_commands_storeId_createdAt_idx" ON "stock_commands"("storeId", "createdAt");

ALTER TABLE "stock_commands"
  ADD CONSTRAINT "stock_commands_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_commands"
  ADD CONSTRAINT "stock_commands_movementId_fkey"
  FOREIGN KEY ("movementId") REFERENCES "inventory_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_commands"
  ADD CONSTRAINT "stock_commands_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
