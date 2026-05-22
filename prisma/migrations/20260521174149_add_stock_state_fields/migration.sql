-- AlterTable
ALTER TABLE "inventory_location_balances" ADD COLUMN     "blockedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "damagedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onHandQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pickedQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reservedQty" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing MVP balances into the new physical stock field.
-- Keep the legacy quantity column as a compatibility alias for now.
UPDATE "inventory_location_balances"
SET "onHandQty" = "quantity";
