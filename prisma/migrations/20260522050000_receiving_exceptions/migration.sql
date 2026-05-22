ALTER TYPE "ReceivingLineStatus" ADD VALUE IF NOT EXISTS 'CLOSED_SHORT';
ALTER TYPE "ReceivingLineStatus" ADD VALUE IF NOT EXISTS 'OVER_RECEIVED';

ALTER TABLE "receiving_lines"
  ADD COLUMN "damagedQty" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shortQty" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "exceptionNote" TEXT;

ALTER TABLE "receiving_lines"
  ADD CONSTRAINT "receiving_lines_quantities_non_negative_chk"
  CHECK ("expectedQty" >= 0 AND "receivedQty" >= 0 AND "damagedQty" >= 0 AND "shortQty" >= 0);
