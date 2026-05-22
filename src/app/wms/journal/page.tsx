import { PageHeader } from "@/components/PageHeader";
import { WorkflowHub, type WorkflowHubCard } from "@/components/wms/WorkflowHub";

const journalCards: WorkflowHubCard[] = [
  {
    href: "/wms/movements",
    title: "История движений",
    description: "Проверьте историю операций: что изменилось, какой товар, откуда и куда переместился.",
    status: "Движения товара",
    action: "Открыть историю"
  },
  {
    href: "/wms/reconciliation",
    title: "Проверка остатков",
    description: "Сравните текущие остатки с дельтами движения и найдите расхождения.",
    status: "Контроль точности",
    action: "Проверить остатки"
  },
  {
    href: "/wms/audit",
    title: "Журнал действий",
    description: "Посмотрите действия пользователей: настройки, приёмка, движения, задания и корректировки.",
    status: "Аудит",
    action: "Открыть аудит"
  }
];

export default function JournalPage() {
  return (
    <div>
      <PageHeader
        title="Журнал"
        description="Движения, аудит и проверка остатков сгруппированы как контрольный журнал склада."
      />
      <WorkflowHub cards={journalCards} />
    </div>
  );
}
