ALTER TABLE "warehouse_work_lines"
  ADD COLUMN "receivingLineId" TEXT;

CREATE INDEX "warehouse_work_lines_receivingLineId_idx" ON "warehouse_work_lines"("receivingLineId");

ALTER TABLE "warehouse_work_lines"
  ADD CONSTRAINT "warehouse_work_lines_receivingLineId_fkey"
  FOREIGN KEY ("receivingLineId") REFERENCES "receiving_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
