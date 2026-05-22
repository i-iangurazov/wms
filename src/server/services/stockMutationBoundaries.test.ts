import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return listFiles(path);
    }
    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

describe("stock mutation boundaries", () => {
  it("keeps inventory location balance writes inside StockMovementService", () => {
    const root = process.cwd();
    const files = listFiles(join(root, "src"));
    const writers = files
      .filter((file) => /inventoryLocationBalance\.(create|update|upsert|delete|deleteMany|updateMany)\(/.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file));

    expect(writers).toEqual(["src/server/services/stockMovementService.ts"]);
  });

  it("does not expose public mutation handlers for the append-only movement ledger", () => {
    const routePath = join(process.cwd(), "src/app/api/inventory/movements/route.ts");
    expect(existsSync(routePath)).toBe(true);
    const route = readFileSync(routePath, "utf8");

    expect(route).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)\b/);
  });

  it("does not update or delete movement rows from application services", () => {
    const root = process.cwd();
    const files = listFiles(join(root, "src"));
    const mutators = files
      .filter((file) => /inventoryMovement\.(update|updateMany|delete|deleteMany)\(/.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file));

    expect(mutators).toEqual([]);
  });

  it("adds a database trigger to keep movement rows append-only", () => {
    const root = process.cwd();
    const migrationDir = join(root, "prisma/migrations/20260522002000_inventory_movements_append_only");
    const migrationPath = join(migrationDir, "migration.sql");
    expect(existsSync(migrationPath)).toBe(true);
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("BEFORE UPDATE OR DELETE ON \"inventory_movements\"");
    expect(migration).toContain("prevent_inventory_movements_mutation");
  });

  it("adds database checks for unavailable stock buckets", () => {
    const root = process.cwd();
    const migrationPath = join(
      root,
      "prisma/migrations/20260522004000_balance_state_non_negative_checks/migration.sql"
    );
    expect(existsSync(migrationPath)).toBe(true);
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain('"reservedQty" >= 0');
    expect(migration).toContain('"pickedQty" >= 0');
    expect(migration).toContain('"damagedQty" >= 0');
    expect(migration).toContain('"blockedQty" >= 0');
    expect(migration).not.toContain('"onHandQty" >= 0');
  });
});
