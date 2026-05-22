import { PageHeader } from "@/components/PageHeader";
import { WorkflowHub, type WorkflowHubCard } from "@/components/wms/WorkflowHub";

const fulfillmentCards: WorkflowHubCard[] = [
  {
    href: "/wms/picking",
    title: "Сборка заказов",
    description: "Создайте и выполните задания сборки. Сотрудник подтверждает ячейку, товар и количество.",
    status: "Готово / В работе / Недосбор",
    action: "Открыть сборку"
  },
  {
    href: "/wms/packing",
    title: "Упаковка",
    description: "Проверьте собранные товары и передайте заказ в отгрузку без интеграции с перевозчиком.",
    status: "Собрано / Упаковано / Отгрузка",
    action: "Открыть упаковку"
  }
];

export default function FulfillmentPage() {
  return (
    <div>
      <PageHeader
        title="Сборка и упаковка"
        description="Сначала товар резервируется и собирается, затем проверяется на упаковке и передаётся в отгрузку."
      />
      <WorkflowHub cards={fulfillmentCards} />
    </div>
  );
}
