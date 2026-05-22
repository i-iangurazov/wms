import { describe, expect, it } from "vitest";
import { allPermissions, canonicalPermission, type Permission } from "@/lib/permissionModel";
import { hasPermission } from "@/server/permissions";

const mutationPermissions: Permission[] = allPermissions.filter(
  (permission) => !["wms.view", "reports.view", "audit.view"].includes(permission)
);

describe("WMS permission matrix", () => {
  it("allows owners to use every canonical permission", () => {
    expect(allPermissions.every((permission) => hasPermission("OWNER", permission))).toBe(true);
  });

  it("allows admins to manage users and WMS operations without organization ownership actions", () => {
    expect(hasPermission("ADMIN", "org.manage")).toBe(false);
    expect(hasPermission("ADMIN", "users.manage")).toBe(true);
    expect(hasPermission("ADMIN", "wms.manageWarehouses")).toBe(true);
    expect(hasPermission("ADMIN", "wms.manageLocations")).toBe(true);
    expect(hasPermission("ADMIN", "products.manage")).toBe(true);
    expect(hasPermission("ADMIN", "barcodes.manage")).toBe(true);
    expect(hasPermission("ADMIN", "adjustments.create")).toBe(true);
    expect(hasPermission("ADMIN", "cycleCounts.approve")).toBe(true);
  });

  it("allows warehouse managers to run operations and approvals without user management", () => {
    expect(hasPermission("WAREHOUSE_MANAGER", "users.manage")).toBe(false);
    expect(hasPermission("WAREHOUSE_MANAGER", "wms.manageLocations")).toBe(true);
    expect(hasPermission("WAREHOUSE_MANAGER", "products.manage")).toBe(true);
    expect(hasPermission("WAREHOUSE_MANAGER", "barcodes.manage")).toBe(true);
    expect(hasPermission("WAREHOUSE_MANAGER", "adjustments.create")).toBe(true);
    expect(hasPermission("WAREHOUSE_MANAGER", "cycleCounts.approve")).toBe(true);
    expect(hasPermission("WAREHOUSE_MANAGER", "picking.create")).toBe(true);
    expect(hasPermission("WAREHOUSE_MANAGER", "reports.view")).toBe(true);
  });

  it("lets warehouse workers execute assigned operational tasks only", () => {
    expect(hasPermission("WAREHOUSE_WORKER", "receiving.execute")).toBe(true);
    expect(hasPermission("WAREHOUSE_WORKER", "putaway.execute")).toBe(true);
    expect(hasPermission("WAREHOUSE_WORKER", "transfers.execute")).toBe(true);
    expect(hasPermission("WAREHOUSE_WORKER", "cycleCounts.execute")).toBe(true);
    expect(hasPermission("WAREHOUSE_WORKER", "picking.execute")).toBe(true);
    expect(hasPermission("WAREHOUSE_WORKER", "packing.execute")).toBe(true);

    expect(hasPermission("WAREHOUSE_WORKER", "adjustments.create")).toBe(false);
    expect(hasPermission("WAREHOUSE_WORKER", "cycleCounts.approve")).toBe(false);
    expect(hasPermission("WAREHOUSE_WORKER", "users.manage")).toBe(false);
    expect(hasPermission("WAREHOUSE_WORKER", "wms.manageWarehouses")).toBe(false);
    expect(hasPermission("WAREHOUSE_WORKER", "wms.manageLocations")).toBe(false);
    expect(hasPermission("WAREHOUSE_WORKER", "org.manage")).toBe(false);
    expect(hasPermission("WAREHOUSE_WORKER", "picking.create")).toBe(false);
  });

  it("keeps viewers read-only", () => {
    expect(hasPermission("VIEWER", "wms.view")).toBe(true);
    expect(hasPermission("VIEWER", "reports.view")).toBe(true);
    expect(hasPermission("VIEWER", "audit.view")).toBe(true);
    expect(mutationPermissions.every((permission) => !hasPermission("VIEWER", permission))).toBe(true);
  });

  it("does not grant WMS access to cashiers by default", () => {
    expect(hasPermission("CASHIER", "wms.view")).toBe(false);
  });

  it("maps legacy permission names to the canonical permission matrix during migration", () => {
    expect(canonicalPermission("WMS_MANAGE_USERS")).toBe("users.manage");
    expect(canonicalPermission("WMS_RECEIVE_STOCK")).toBe("receiving.execute");
    expect(hasPermission("WAREHOUSE_WORKER", "WMS_RECEIVE_STOCK")).toBe(true);
    expect(hasPermission("WAREHOUSE_WORKER", "WMS_ADJUST_STOCK")).toBe(false);
    expect(hasPermission("WAREHOUSE_MANAGER", "WMS_APPROVE_CYCLE_COUNT")).toBe(true);
  });
});
