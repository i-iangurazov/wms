import { describe, expect, it } from "vitest";
import { wmsNavItems } from "@/lib/wmsText";
import { canRoleAccessWmsPath, protectedRouteMatrix, visibleWmsNavItems } from "@/server/routeAccess";

describe("WMS route access matrix", () => {
  it("defines permissions for every visible navigation route", () => {
    const matrixPaths = new Set(protectedRouteMatrix.map((item) => item.path));
    expect(wmsNavItems.every((item) => matrixPaths.has(item.href))).toBe(true);
  });

  it("hides operational and admin routes from viewers", () => {
    const viewerRoutes = visibleWmsNavItems("VIEWER").map((item) => item.href);
    expect(viewerRoutes).toContain("/wms");
    expect(viewerRoutes).toContain("/wms/inventory");
    expect(viewerRoutes).toContain("/wms/movements");
    expect(viewerRoutes).not.toContain("/wms/receiving");
    expect(viewerRoutes).not.toContain("/wms/settings");
  });

  it("shows worker routes without exposing admin pages", () => {
    const workerRoutes = visibleWmsNavItems("WAREHOUSE_WORKER").map((item) => item.href);
    expect(workerRoutes).toContain("/wms/receiving");
    expect(workerRoutes).toContain("/wms/put-away");
    expect(workerRoutes).toContain("/wms/picking");
    expect(workerRoutes).toContain("/wms/packing");
    expect(workerRoutes).toContain("/wms/transfers");
    expect(workerRoutes).not.toContain("/wms/adjustments");
    expect(workerRoutes).not.toContain("/wms/products");
    expect(workerRoutes).not.toContain("/wms/barcodes");
    expect(workerRoutes).not.toContain("/wms/audit");
    expect(workerRoutes).not.toContain("/wms/settings");
  });

  it("hides all WMS navigation from roles without WMS access", () => {
    expect(visibleWmsNavItems("CASHIER")).toHaveLength(0);
  });

  it("blocks unauthorized protected routes by role", () => {
    expect(canRoleAccessWmsPath("WAREHOUSE_WORKER", "/wms/receiving")).toBe(true);
    expect(canRoleAccessWmsPath("WAREHOUSE_WORKER", "/wms/adjustments")).toBe(false);
    expect(canRoleAccessWmsPath("WAREHOUSE_WORKER", "/wms/settings")).toBe(false);
    expect(canRoleAccessWmsPath("WAREHOUSE_WORKER", "/wms/locations")).toBe(false);
    expect(canRoleAccessWmsPath("WAREHOUSE_WORKER", "/wms/products")).toBe(false);
    expect(canRoleAccessWmsPath("VIEWER", "/wms/inventory")).toBe(true);
    expect(canRoleAccessWmsPath("VIEWER", "/wms/receiving")).toBe(false);
    expect(canRoleAccessWmsPath("VIEWER", "/wms/transfers")).toBe(false);
    expect(canRoleAccessWmsPath("ADMIN", "/wms/settings")).toBe(true);
  });
});
