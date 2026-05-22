import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function formatWmsDateTime(value: string | Date) {
  return format(new Date(value), "dd MMM yyyy, HH:mm", { locale: ru });
}
