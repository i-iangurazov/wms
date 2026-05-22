import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

function seedAdminPassword() {
  if (process.env.SEED_ADMIN_PASSWORD) {
    return process.env.SEED_ADMIN_PASSWORD;
  }
  try {
    const envFile = readFileSync(".env", "utf8");
    const match = envFile.match(/^SEED_ADMIN_PASSWORD=(.*)$/m);
    return match?.[1]?.replace(/^["']|["']$/g, "") || "ChangeMe123!";
  } catch {
    return "ChangeMe123!";
  }
}

async function login(page: Page, email = "admin@example.com", password = seedAdminPassword()) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/wms/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Операционный центр склада" })).toBeVisible({ timeout: 45_000 });
}

async function apiJson<T>(page: Page, method: string, url: string, data?: unknown): Promise<T> {
  const response = await page.context().request.fetch(url, { method, data });
  const text = await response.text();
  expect(response.ok(), `${method} ${url} failed with ${response.status()}: ${text}`).toBeTruthy();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

test.describe("WMS product UI foundation", () => {
  test("requires login before opening protected WMS screens", async ({ page }) => {
    await page.goto("/wms");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Вход в WMS" })).toBeVisible();
  });

  test("logs in and shows workflow-first navigation with real icons", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("link", { name: /Обзор/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Задачи/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Товары и остатки/ })).toBeVisible();
    await expect(page.locator("svg.lucide").first()).toBeAttached();
  });

  test("creates product and warehouse through polished Russian forms", async ({ page }) => {
    await login(page);
    const suffix = String(Date.now());
    const sku = `E2E-SKU-${suffix}`;
    const warehouseCode = `E2E-WH-${suffix}`;

    await page.goto("/wms/products");
    await page.getByLabel("SKU").first().fill(sku);
    await page.getByLabel("Название").first().fill(`Тестовый товар ${suffix}`);
    await page.getByLabel("Штрихкод").first().fill(`E2E-BAR-${suffix}`);
    await page.getByRole("button", { name: "Создать товар" }).click();
    await expect(page.getByText("Товар создан.")).toBeVisible();
    await expect(page.locator("tbody td", { hasText: sku }).first()).toBeVisible();

    await page.goto("/wms/warehouses");
    await page.getByLabel("Код").fill(warehouseCode);
    await page.getByLabel("Название").fill(`Тестовый склад ${suffix}`);
    await page.getByRole("button", { name: "Создать" }).click();
    await expect(page.locator("tbody td", { hasText: warehouseCode }).first()).toBeVisible();
    await expect(page.getByTestId("wms-select-trigger").first()).toBeVisible();
  });

  test("runs a real receiving, put-away, transfer, count, pick, pack workflow and verifies UI state", async ({ page }) => {
    await login(page);
    const suffix = String(Date.now());

    const { product } = await apiJson<{ product: { id: string; sku: string; barcode: string | null } }>(
      page,
      "POST",
      "/api/products",
      {
        sku: `FLOW-SKU-${suffix}`,
        name: `Потоковый товар ${suffix}`,
        barcode: `FLOW-BAR-${suffix}`
      }
    );
    const { warehouse } = await apiJson<{ warehouse: { id: string; code: string } }>(page, "POST", "/api/warehouses", {
      code: `FLOW-WH-${suffix}`,
      name: `Потоковый склад ${suffix}`,
      status: "ACTIVE"
    });
    const { location: receivingLocation } = await apiJson<{ location: { id: string; code: string; barcode: string | null } }>(
      page,
      "POST",
      "/api/warehouse-locations",
      {
        warehouseId: warehouse.id,
        code: `RCV-${suffix}`,
        barcode: `RCV-BAR-${suffix}`,
        type: "RECEIVING",
        status: "ACTIVE",
        isReceivable: true
      }
    );
    const { location: storageLocation } = await apiJson<{ location: { id: string; code: string; barcode: string | null } }>(
      page,
      "POST",
      "/api/warehouse-locations",
      {
        warehouseId: warehouse.id,
        code: `STO-${suffix}`,
        barcode: `STO-BAR-${suffix}`,
        type: "STORAGE",
        status: "ACTIVE"
      }
    );
    const { location: pickingLocation } = await apiJson<{ location: { id: string; code: string; barcode: string | null } }>(
      page,
      "POST",
      "/api/warehouse-locations",
      {
        warehouseId: warehouse.id,
        code: `PICK-${suffix}`,
        barcode: `PICK-BAR-${suffix}`,
        type: "PICKING",
        status: "ACTIVE",
        isPickable: true,
        isSellable: true
      }
    );

    const { session } = await apiJson<{ session: { id: string; reference: string | null } }>(
      page,
      "POST",
      "/api/receiving/sessions",
      {
        warehouseId: warehouse.id,
        receivingLocationId: receivingLocation.id,
        reference: `RCPT-${suffix}`
      }
    );
    const { line } = await apiJson<{ line: { id: string } }>(
      page,
      "POST",
      `/api/receiving/sessions/${session.id}/lines`,
      {
        productId: product.id,
        expectedQty: 5
      }
    );
    await apiJson(page, "POST", `/api/receiving/sessions/${session.id}/receive`, {
      lineId: line.id,
      quantity: 5,
      idempotencyKey: `e2e-receive-${suffix}`
    });

    const { work: putawayWork } = await apiJson<{ work: { lines: Array<{ id: string }> } }>(
      page,
      "POST",
      "/api/put-away",
      {
        action: "generate",
        sessionId: session.id
      }
    );
    await apiJson(page, "POST", "/api/put-away", {
      action: "confirmLine",
      lineId: putawayWork.lines[0].id,
      toLocationId: storageLocation.id,
      quantity: 5,
      idempotencyKey: `e2e-putaway-${suffix}`
    });

    await apiJson(page, "POST", "/api/transfers", {
      fromLocationId: storageLocation.id,
      toLocationId: pickingLocation.id,
      productId: product.id,
      quantity: 3,
      idempotencyKey: `e2e-transfer-${suffix}`
    });

    await apiJson(page, "POST", "/api/cycle-counts", {
      warehouseId: warehouse.id,
      locationId: storageLocation.id
    });

    const { order } = await apiJson<{ order: { id: string; number: string } }>(page, "POST", "/api/orders", {
      number: `ORDER-${suffix}`,
      productId: product.id,
      quantity: 2
    });
    await apiJson(page, "POST", "/api/reservations", {
      action: "allocate",
      orderId: order.id,
      warehouseId: warehouse.id,
      idempotencyKey: `e2e-allocate-${suffix}`
    });
    const { work: pickWork } = await apiJson<{ work: { lines: Array<{ id: string }> } }>(
      page,
      "POST",
      "/api/warehouse-work",
      {
        orderId: order.id,
        warehouseId: warehouse.id
      }
    );
    await apiJson(page, "POST", `/api/warehouse-work/lines/${pickWork.lines[0].id}/pick`, {
      locationScan: pickingLocation.barcode ?? pickingLocation.code,
      productScan: product.barcode ?? product.sku,
      quantity: 2,
      idempotencyKey: `e2e-pick-${suffix}`
    });

    const { work: packWork } = await apiJson<{ work: { lines: Array<{ id: string }> } }>(
      page,
      "POST",
      "/api/packing",
      {
        action: "CREATE_WORK",
        orderId: order.id,
        warehouseId: warehouse.id
      }
    );
    await apiJson(page, "POST", "/api/packing", {
      action: "CONFIRM_LINE",
      lineId: packWork.lines[0].id,
      productScan: product.barcode ?? product.sku,
      quantity: 2
    });
    await apiJson(page, "POST", "/api/packing", {
      action: "READY_TO_SHIP",
      orderId: order.id
    });

    await page.goto("/wms/inventory");
    await page.getByPlaceholder("Поиск по товару, SKU, складу или ячейке").fill(product.sku);
    await expect(page.getByText(product.sku).first()).toBeVisible();

    await page.goto("/wms/movements");
    await page.getByPlaceholder("Поиск по товару, ячейке или сотруднику").fill(product.sku);
    await expect(page.getByText(product.sku).first()).toBeVisible();
    await expect(page.locator("tbody").getByText("Приёмка").first()).toBeVisible();

    await page.goto("/wms/packing");
    await expect(page.getByText(order.number)).toBeVisible();
    await expect(page.getByText("Передан в отгрузку").first()).toBeVisible();
  });

  test("shows Russian access denied UI for viewer-only users", async ({ page }) => {
    await login(page);
    const suffix = String(Date.now());
    const viewerEmail = `viewer-${suffix}@example.com`;
    const viewerPassword = `ViewerPass-${suffix}!`;
    await apiJson(page, "POST", "/api/users", {
      email: viewerEmail,
      name: `Наблюдатель ${suffix}`,
      role: "VIEWER",
      initialPassword: viewerPassword
    });

    await page.context().clearCookies();
    await login(page, viewerEmail, viewerPassword);
    await page.goto("/wms/settings");
    await expect(page.getByText("Недостаточно прав")).toBeVisible();
    await expect(page.getByText("У вас нет доступа к этому действию")).toBeVisible();
  });
});
