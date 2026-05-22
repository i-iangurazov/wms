import type { Permission, PermissionKey } from "@/lib/permissionModel";
import { AppError } from "@/server/errors";
import type { RequestContext } from "@/server/auth";
import { prisma } from "@/server/db";
import { hasPermission } from "@/server/permissions";

export type TaskCenterItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  href: string;
  action: string;
  meta: string[];
  createdAt: Date;
};

export type TaskCenterGroup = {
  key: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  tasks: TaskCenterItem[];
};

export type TaskCenter = {
  summary: {
    total: number;
    inProgress: number;
    exceptions: number;
  };
  groups: TaskCenterGroup[];
};

const operationalPermissions: Permission[] = [
  "receiving.execute",
  "putaway.execute",
  "transfers.execute",
  "cycleCounts.execute",
  "picking.execute",
  "packing.execute"
];

function assertCanUseTaskCenter(context: RequestContext) {
  if (!operationalPermissions.some((permission) => hasPermission(context.role, permission))) {
    throw new AppError("У вас нет доступа к этому действию", 403);
  }
}

function can(context: RequestContext, permission: PermissionKey) {
  return hasPermission(context.role, permission);
}

function isOperatorOnly(context: RequestContext) {
  return (
    context.role === "WAREHOUSE_WORKER" ||
    context.role === "STAFF" ||
    context.role === "CASHIER"
  );
}

const workStatusLabels = {
  OPEN: "Новая",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена"
} as const;

const receivingStatusLabels = {
  DRAFT: "Новая",
  RECEIVING: "В приёмке",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена"
} as const;

const cycleCountStatusLabels = {
  DRAFT: "Запланирована",
  COUNTING: "Идёт подсчёт",
  PENDING_APPROVAL: "На проверке",
  APPROVED: "Утверждена",
  CANCELLED: "Отменена"
} as const;

function openWorkAssigneeFilter(context: RequestContext) {
  return isOperatorOnly(context) ? [{ assignedToId: null }, { assignedToId: context.user.id }] : undefined;
}

export async function getTaskCenter(context: RequestContext): Promise<TaskCenter> {
  assertCanUseTaskCenter(context);

  const groups: TaskCenterGroup[] = [];
  const workAssignmentFilter = openWorkAssigneeFilter(context);

  if (can(context, "receiving.execute")) {
    const receiving = await prisma.receivingSession.findMany({
      where: { storeId: context.storeId, status: { in: ["DRAFT", "RECEIVING"] } },
      include: { warehouse: true, receivingLocation: true, _count: { select: { lines: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8
    });

    groups.push({
      key: "receiving",
      title: "Приёмка",
      description: "Примите товар, проверьте количество и отметьте повреждения.",
      emptyTitle: "Нет открытой приёмки",
      emptyBody: "Когда появится новая поставка, она будет здесь.",
      tasks: receiving.map((session) => ({
        id: session.id,
        title: session.reference ? `Приёмка ${session.reference}` : `Приёмка ${session.id.slice(0, 8)}`,
        description: `${session.warehouse.code} / ${session.receivingLocation.code}`,
        status: receivingStatusLabels[session.status],
        href: "/wms/receiving",
        action: session.status === "DRAFT" ? "Начать приёмку" : "Продолжить",
        meta: [`Товаров: ${session._count.lines}`],
        createdAt: session.createdAt
      }))
    });
  }

  if (can(context, "putaway.execute")) {
    const putawayWork = await prisma.warehouseWork.findMany({
      where: {
        storeId: context.storeId,
        type: "PUTAWAY",
        status: { in: ["OPEN", "IN_PROGRESS"] },
        OR: workAssignmentFilter
      },
      include: {
        warehouse: true,
        assignedTo: true,
        lines: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          include: { product: true, sourceLocation: true, destinationLocation: true },
          orderBy: { createdAt: "asc" },
          take: 3
        },
        _count: { select: { lines: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 8
    });

    groups.push({
      key: "putaway",
      title: "Размещение",
      description: "Переместите принятый товар из зоны приёмки в ячейки хранения или сборки.",
      emptyTitle: "Нет заданий на размещение",
      emptyBody: "Сначала выполните приёмку или создайте задание на размещение.",
      tasks: putawayWork.map((work) => {
        const firstLine = work.lines[0];
        return {
          id: work.id,
          title: `Размещение ${work.id.slice(0, 8)}`,
          description: firstLine
            ? `${firstLine.product.sku}: ${firstLine.sourceLocation.code} → ${firstLine.destinationLocation?.code ?? "выбрать ячейку"}`
            : `${work.warehouse.code}: ${work._count.lines} шагов`,
          status: workStatusLabels[work.status],
          href: "/wms/put-away",
          action: "Открыть размещение",
          meta: [`Склад: ${work.warehouse.code}`, `Шагов: ${work._count.lines}`],
          createdAt: work.createdAt
        };
      })
    });
  }

  if (can(context, "putaway.execute")) {
    const replenishmentWork = await prisma.warehouseWork.findMany({
      where: {
        storeId: context.storeId,
        type: "REPLENISHMENT",
        status: { in: ["OPEN", "IN_PROGRESS"] },
        OR: workAssignmentFilter
      },
      include: {
        warehouse: true,
        replenishmentRule: true,
        lines: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          include: { product: true, sourceLocation: true, destinationLocation: true },
          orderBy: { createdAt: "asc" },
          take: 3
        },
        _count: { select: { lines: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 8
    });

    groups.push({
      key: "replenishment",
      title: "Пополнение",
      description: "Пополните ячейки сборки из хранения, когда остаток ниже минимума.",
      emptyTitle: "Нет заданий на пополнение",
      emptyBody: "Если ячейка сборки опустится ниже минимума, задание появится здесь.",
      tasks: replenishmentWork.map((work) => {
        const firstLine = work.lines[0];
        return {
          id: work.id,
          title: work.replenishmentRule ? `Пополнение ${work.replenishmentRule.id.slice(0, 8)}` : `Пополнение ${work.id.slice(0, 8)}`,
          description: firstLine
            ? `${firstLine.product.sku}: ${firstLine.sourceLocation.code} → ${firstLine.destinationLocation?.code ?? "ячейка сборки"}`
            : `${work.warehouse.code}: ${work._count.lines} шагов`,
          status: workStatusLabels[work.status],
          href: "/wms/replenishment",
          action: "Открыть пополнение",
          meta: [`Склад: ${work.warehouse.code}`, `Шагов: ${work._count.lines}`],
          createdAt: work.createdAt
        };
      })
    });
  }

  if (can(context, "transfers.execute")) {
    groups.push({
      key: "transfers",
      title: "Перемещения",
      description: "Быстрая операция со сканированием исходной ячейки, товара и назначения.",
      emptyTitle: "Перемещение выполняется вручную",
      emptyBody: "Откройте форму, отсканируйте ячейки и подтвердите количество.",
      tasks: [
        {
          id: "manual-transfer",
          title: "Переместить товар",
          description: "Для перемещения нужна исходная ячейка, товар, ячейка назначения и количество.",
          status: "Операция со сканером",
          href: "/wms/transfers",
          action: "Начать перемещение",
          meta: ["Проверяется доступный остаток"],
          createdAt: new Date(0)
        }
      ]
    });
  }

  if (can(context, "picking.execute")) {
    const pickWork = await prisma.warehouseWork.findMany({
      where: {
        storeId: context.storeId,
        type: "PICK",
        status: { in: ["OPEN", "IN_PROGRESS"] },
        OR: workAssignmentFilter
      },
      include: {
        warehouse: true,
        sourceOrder: true,
        lines: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          include: { product: true, sourceLocation: true },
          orderBy: { createdAt: "asc" },
          take: 3
        },
        _count: { select: { lines: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 8
    });

    groups.push({
      key: "picking",
      title: "Сборка заказов",
      description: "Соберите заказ по шагам: ячейка, товар, количество.",
      emptyTitle: "Нет заданий на сборку",
      emptyBody: "Новые заказы появятся здесь после создания задания.",
      tasks: pickWork.map((work) => {
        const firstLine = work.lines[0];
        return {
          id: work.id,
          title: work.sourceOrder ? `Заказ ${work.sourceOrder.number}` : `Сборка ${work.id.slice(0, 8)}`,
          description: firstLine
            ? `${firstLine.sourceLocation.code} / ${firstLine.product.sku}`
            : `${work.warehouse.code}: ${work._count.lines} шагов`,
          status: workStatusLabels[work.status],
          href: "/wms/picking",
          action: "Открыть сборку",
          meta: [`Склад: ${work.warehouse.code}`, `Шагов: ${work._count.lines}`],
          createdAt: work.createdAt
        };
      })
    });
  }

  if (can(context, "packing.execute")) {
    const packWork = await prisma.warehouseWork.findMany({
      where: {
        storeId: context.storeId,
        type: "PACK",
        status: { in: ["OPEN", "IN_PROGRESS"] },
        OR: workAssignmentFilter
      },
      include: {
        warehouse: true,
        sourceOrder: true,
        _count: { select: { lines: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 8
    });

    groups.push({
      key: "packing",
      title: "Упаковка",
      description: "Проверьте собранный заказ перед передачей в отгрузку.",
      emptyTitle: "Нет заданий на упаковку",
      emptyBody: "Задания появятся после завершения сборки заказа.",
      tasks: packWork.map((work) => ({
        id: work.id,
        title: work.sourceOrder ? `Упаковка заказа ${work.sourceOrder.number}` : `Упаковка ${work.id.slice(0, 8)}`,
        description: `${work.warehouse.code}: проверьте товары и количество.`,
        status: workStatusLabels[work.status],
        href: "/wms/packing",
        action: "Открыть упаковку",
        meta: [`Шагов: ${work._count.lines}`],
        createdAt: work.createdAt
      }))
    });
  }

  if (can(context, "cycleCounts.execute")) {
    const cycleCounts = await prisma.cycleCountSession.findMany({
      where: { storeId: context.storeId, status: { in: ["DRAFT", "COUNTING", "PENDING_APPROVAL"] } },
      include: { warehouse: true, location: true, _count: { select: { lines: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8
    });

    groups.push({
      key: "cycleCounts",
      title: "Инвентаризация",
      description: "Пересчитайте ячейку и отправьте расхождения на проверку.",
      emptyTitle: "Нет активной инвентаризации",
      emptyBody: "Создайте пересчёт для склада или ячейки, когда нужно проверить остатки.",
      tasks: cycleCounts.map((session) => ({
        id: session.id,
        title: `Пересчёт ${session.location.code}`,
        description: `${session.warehouse.code} / ${session.location.code}`,
        status: cycleCountStatusLabels[session.status],
        href: "/wms/cycle-counts",
        action: session.status === "PENDING_APPROVAL" ? "Открыть проверку" : "Продолжить подсчёт",
        meta: [`Строк: ${session._count.lines}`],
        createdAt: session.createdAt
      }))
    });
  }

  const allTasks = groups.flatMap((group) => group.tasks);
  return {
    summary: {
      total: allTasks.length,
      inProgress: allTasks.filter((task) => task.status === "В работе" || task.status === "Идёт подсчёт" || task.status === "В приёмке").length,
      exceptions: allTasks.filter((task) => task.status.includes("провер")).length
    },
    groups
  };
}
