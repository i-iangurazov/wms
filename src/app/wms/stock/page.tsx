import { PageHeader } from "@/components/PageHeader";
import { WorkflowHub, type WorkflowHubCard } from "@/components/wms/WorkflowHub";

const stockCards: WorkflowHubCard[] = [
  {
    href: "/wms/inventory",
    title: "Остатки",
    description: "Посмотрите товар по складам, ячейкам и доступности: в наличии, зарезервировано, повреждено или заблокировано.",
    status: "Просмотр",
    action: "Открыть остатки"
  },
  {
    href: "/wms/products",
    title: "Товары",
    description: "Создайте товары и варианты или импортируйте каталог из CSV.",
    status: "Настройка каталога",
    action: "Открыть товары"
  },
  {
    href: "/wms/barcodes",
    title: "Штрихкоды",
    description: "Зарегистрируйте дополнительные коды для товаров, вариантов, ячеек, заказов и заданий.",
    status: "Сканирование",
    action: "Управлять штрихкодами"
  },
  {
    href: "/wms/adjustments",
    title: "Корректировки",
    description: "Измените остаток или состояние товара с причиной и обязательной проверкой прав.",
    status: "Требует прав менеджера",
    action: "Создать корректировку"
  }
];

export default function StockPage() {
  return (
    <div>
      <PageHeader
        title="Товары и остатки"
        description="Каталог, штрихкоды, остатки и контролируемые корректировки в одном рабочем разделе."
      />
      <WorkflowHub cards={stockCards} />
    </div>
  );
}
