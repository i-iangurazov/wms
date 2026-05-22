import Link from "next/link";

export function AccessDenied() {
  return (
    <section className="mx-auto max-w-2xl rounded-lg border border-border bg-panel p-6 shadow-sm">
      <p className="text-sm font-semibold text-danger">Недостаточно прав</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">У вас нет доступа к этому действию</h1>
      <p className="mt-3 text-sm text-muted">Обратитесь к администратору, если вам нужен доступ к этому разделу.</p>
      <Link
        href="/wms"
        className="mt-5 inline-flex rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-surface"
      >
        Вернуться к обзору
      </Link>
    </section>
  );
}
