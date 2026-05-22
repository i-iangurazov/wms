import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { requirePermission } from "@/server/permissions";

export async function getWmsDashboard(context: RequestContext) {
  requirePermission(context.role, "wms.view");
  const [
    activeWarehouses,
    activeLocations,
    balances,
    recentMovements,
    pendingReceiving,
    pendingPutAway,
    pendingPicking,
    stockDiscrepancies
  ] = await Promise.all([
    prisma.warehouse.count({ where: { storeId: context.storeId, status: "ACTIVE" } }),
    prisma.warehouseLocation.count({ where: { storeId: context.storeId, status: "ACTIVE" } }),
    prisma.inventoryLocationBalance.aggregate({
      where: { storeId: context.storeId },
      _sum: { onHandQty: true }
    }),
    prisma.inventoryMovement.findMany({
      where: { storeId: context.storeId },
      include: { product: true, fromLocation: true, toLocation: true },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.receivingSession.findMany({
      where: { storeId: context.storeId, status: { in: ["DRAFT", "RECEIVING"] } },
      include: { warehouse: true, receivingLocation: true, _count: { select: { lines: true } } },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.inventoryLocationBalance.findMany({
      where: {
        storeId: context.storeId,
        onHandQty: { gt: 0 },
        location: { type: "RECEIVING" }
      },
      include: { product: true, location: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
    prisma.warehouseWork.findMany({
      where: { storeId: context.storeId, type: "PICK", status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { sourceOrder: true, warehouse: true, _count: { select: { lines: true } } },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.cycleCountLine.findMany({
      where: {
        difference: { not: 0 },
        session: { storeId: context.storeId, status: { in: ["COUNTING", "PENDING_APPROVAL"] } }
      },
      include: { product: true, session: { include: { location: true, warehouse: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8
    })
  ]);

  return {
    metrics: {
      activeWarehouses,
      activeLocations,
      totalUnits: balances._sum.onHandQty ?? 0,
      pendingReceiving: pendingReceiving.length,
      pendingPutAway: pendingPutAway.length,
      pendingPicking: pendingPicking.length,
      stockDiscrepancies: stockDiscrepancies.length
    },
    recentMovements,
    pendingReceiving,
    pendingPutAway,
    pendingPicking,
    stockDiscrepancies
  };
}
