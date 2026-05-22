import { describe, expect, it } from "vitest";
import { hasPermission } from "@/server/permissions";

describe("WMS permissions", () => {
  it("allows admin users to manage warehouses", () => {
    expect(hasPermission("OWNER", "WMS_MANAGE_USERS")).toBe(true);
    expect(hasPermission("ADMIN", "WMS_MANAGE_WAREHOUSES")).toBe(true);
    expect(hasPermission("ADMIN", "WMS_MANAGE_PRODUCTS")).toBe(true);
    expect(hasPermission("ADMIN", "WMS_MANAGE_BARCODES")).toBe(true);
    expect(hasPermission("ADMIN", "WMS_VIEW_AUDIT")).toBe(true);
    expect(hasPermission("ADMIN", "WMS_MANAGE_USERS")).toBe(true);
  });

  it("allows staff to do operational work without adjustment access", () => {
    expect(hasPermission("WAREHOUSE_WORKER", "WMS_RECEIVE_STOCK")).toBe(true);
    expect(hasPermission("STAFF", "WMS_RECEIVE_STOCK")).toBe(true);
    expect(hasPermission("STAFF", "WMS_MANAGE_PRODUCTS")).toBe(false);
    expect(hasPermission("STAFF", "WMS_MANAGE_BARCODES")).toBe(false);
    expect(hasPermission("STAFF", "WMS_VIEW_AUDIT")).toBe(false);
    expect(hasPermission("STAFF", "WMS_ADJUST_STOCK")).toBe(false);
    expect(hasPermission("STAFF", "WMS_APPROVE_CYCLE_COUNT")).toBe(false);
  });

  it("does not grant WMS access to cashiers by default", () => {
    expect(hasPermission("CASHIER", "WMS_VIEW")).toBe(false);
  });

  it("allows viewers to inspect WMS data without operations", () => {
    expect(hasPermission("VIEWER", "WMS_VIEW")).toBe(true);
    expect(hasPermission("VIEWER", "WMS_MOVE_STOCK")).toBe(false);
  });

  it("allows managers to approve cycle counts and adjust stock", () => {
    expect(hasPermission("WAREHOUSE_MANAGER", "WMS_APPROVE_CYCLE_COUNT")).toBe(true);
    expect(hasPermission("MANAGER", "WMS_APPROVE_CYCLE_COUNT")).toBe(true);
    expect(hasPermission("MANAGER", "WMS_ADJUST_STOCK")).toBe(true);
    expect(hasPermission("MANAGER", "WMS_VIEW_AUDIT")).toBe(true);
    expect(hasPermission("MANAGER", "WMS_MANAGE_USERS")).toBe(false);
  });
});
