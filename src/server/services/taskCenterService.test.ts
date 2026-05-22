import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  prisma: {
    receivingSession: { findMany: vi.fn() },
    warehouseWork: { findMany: vi.fn() },
    cycleCountSession: { findMany: vi.fn() }
  }
}));

vi.mock("@/server/db", () => ({ prisma: db.prisma }));

import { getTaskCenter } from "@/server/services/taskCenterService";
import type { RequestContext } from "@/server/auth";

function context(role: RequestContext["role"]): RequestContext {
  return {
    storeId: "store-a",
    role,
    user: {
      id: "user-a",
      email: "worker@example.com",
      name: "Worker",
      passwordHash: "hash",
      role,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
}

describe("task center service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.prisma.receivingSession.findMany.mockResolvedValue([]);
    db.prisma.warehouseWork.findMany.mockResolvedValue([]);
    db.prisma.cycleCountSession.findMany.mockResolvedValue([]);
  });

  it("blocks viewer access to executable task center", async () => {
    await expect(getTaskCenter(context("VIEWER"))).rejects.toMatchObject({ status: 403 });
    expect(db.prisma.receivingSession.findMany).not.toHaveBeenCalled();
  });

  it("scopes task queries to organization and worker assignment", async () => {
    await getTaskCenter(context("WAREHOUSE_WORKER"));

    expect(db.prisma.receivingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: "store-a" })
      })
    );
    expect(db.prisma.warehouseWork.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: "store-a",
          type: "PUTAWAY",
          OR: [{ assignedToId: null }, { assignedToId: "user-a" }]
        })
      })
    );
  });

  it("returns Russian task groups for open warehouse work", async () => {
    db.prisma.receivingSession.findMany.mockResolvedValue([
      {
        id: "rec-1",
        reference: "PO-10",
        status: "RECEIVING",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        warehouse: { code: "MAIN" },
        receivingLocation: { code: "REC-01" },
        _count: { lines: 2 }
      }
    ]);
    db.prisma.warehouseWork.findMany.mockImplementation(({ where }: { where: { type: string } }) => {
      if (where.type !== "PICK") {
        return [];
      }
      return [
        {
          id: "work-1",
          status: "OPEN",
          createdAt: new Date("2026-01-02T00:00:00Z"),
          warehouse: { code: "MAIN" },
          sourceOrder: { number: "1001" },
          lines: [{ product: { sku: "SKU-1" }, sourceLocation: { code: "PICK-01" } }],
          _count: { lines: 1 }
        }
      ];
    });

    const result = await getTaskCenter(context("WAREHOUSE_WORKER"));

    expect(result.summary.total).toBeGreaterThanOrEqual(3);
    expect(result.groups.find((group) => group.key === "receiving")?.tasks[0]).toMatchObject({
      title: "Приёмка PO-10",
      status: "В приёмке",
      action: "Продолжить"
    });
    expect(result.groups.find((group) => group.key === "picking")?.tasks[0]).toMatchObject({
      title: "Заказ 1001",
      status: "Новая",
      action: "Открыть сборку"
    });
  });
});
