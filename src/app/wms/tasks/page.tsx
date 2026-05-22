import { PageHeader } from "@/components/PageHeader";
import { WorkflowHub, type WorkflowHubCard } from "@/components/wms/WorkflowHub";

const taskCards: WorkflowHubCard[] = [
  {
    href: "/wms/put-away",
    title: "Размещение",
    description: "Разместите принятый товар из зоны приёмки в ячейки хранения или сборки.",
    status: "Ждёт размещения",
    action: "Открыть задания"
  },
  {
    href: "/wms/transfers",
    title: "Перемещение",
    description: "Перенесите товар между ячейками с проверкой исходной ячейки, товара и назначения.",
    status: "Операция со сканером",
    action: "Начать перемещение"
  },
  {
    href: "/wms/replenishment",
    title: "Пополнение",
    description: "Пополните ячейки сборки из хранения, когда остаток ниже минимального уровня.",
    status: "Рекомендуется / В работе",
    action: "Проверить пополнение"
  },
  {
    href: "/wms/picking",
    title: "Сборка заказов",
    description: "Соберите товары по заданию: отсканируйте ячейку, товар и подтвердите количество.",
    status: "Готово к сборке",
    action: "Перейти к сборке"
  },
  {
    href: "/wms/packing",
    title: "Упаковка",
    description: "Проверьте собранные товары перед передачей заказа в отгрузку.",
    status: "Собрано / Упаковка",
    action: "Открыть упаковку"
  },
  {
    href: "/wms/cycle-counts",
    title: "Инвентаризация",
    description: "Выполните пересчёт ячейки и отправьте расхождения на проверку.",
    status: "Идёт подсчёт / На проверке",
    action: "Открыть пересчёты"
  }
];

export default function TasksPage() {
  return (
    <div>
      <PageHeader
        title="Задачи"
        description="Единый старт для ежедневной работы склада: что нужно сделать, где товар, какой статус и что делать дальше."
      />
      <WorkflowHub cards={taskCards} />
    </div>
  );
}
