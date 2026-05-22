CREATE OR REPLACE FUNCTION prevent_inventory_movements_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movements is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_movements_append_only ON "inventory_movements";

CREATE TRIGGER inventory_movements_append_only
BEFORE UPDATE OR DELETE ON "inventory_movements"
FOR EACH ROW
EXECUTE FUNCTION prevent_inventory_movements_mutation();
