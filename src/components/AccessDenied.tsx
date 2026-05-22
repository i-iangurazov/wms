import Link from "next/link";
import { cardClass, secondaryButtonClass } from "@/components/FormControls";

export function AccessDenied() {
  return (
    <section className={`mx-auto max-w-2xl ${cardClass}`}>
      <p className="text-sm font-semibold text-danger">Недостаточно прав</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">У вас нет доступа к этому действию</h1>
      <p className="mt-3 text-sm text-muted">Обратитесь к администратору, если вам нужен доступ к этому разделу.</p>
      <Link href="/wms" className={`${secondaryButtonClass} mt-5`}>
        Вернуться к обзору
      </Link>
    </section>
  );
}
