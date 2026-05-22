ALTER TABLE "warehouse_work_lines" ADD COLUMN "reservationId" TEXT;

ALTER TABLE "warehouse_work_lines"
  ADD CONSTRAINT "warehouse_work_lines_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "inventory_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "warehouse_work_lines_reservationId_idx" ON "warehouse_work_lines"("reservationId");
