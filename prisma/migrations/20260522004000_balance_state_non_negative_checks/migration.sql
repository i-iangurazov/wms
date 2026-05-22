ALTER TABLE "inventory_location_balances"
ADD CONSTRAINT "inventory_location_balances_reserved_non_negative" CHECK ("reservedQty" >= 0),
ADD CONSTRAINT "inventory_location_balances_picked_non_negative" CHECK ("pickedQty" >= 0),
ADD CONSTRAINT "inventory_location_balances_damaged_non_negative" CHECK ("damagedQty" >= 0),
ADD CONSTRAINT "inventory_location_balances_blocked_non_negative" CHECK ("blockedQty" >= 0);
