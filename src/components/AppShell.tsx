import Link from "next/link";
import { commonText, wmsNavItems } from "@/lib/wmsText";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-panel p-5 lg:block">
        <div className="mb-8">
          <div className="text-lg font-semibold">{commonText.appName}</div>
          <div className="text-sm text-muted">{commonText.appSubtitle}</div>
        </div>
        <nav className="space-y-1">
          {wmsNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border bg-panel/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-muted">{commonText.appName}</div>
            <div className="flex items-center gap-3">
              <div className="hidden text-xs text-muted sm:block">{commonText.storeScope}</div>
              <form action="/api/auth/logout" method="post">
                <button className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface" type="submit">
                  Выйти
                </button>
              </form>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {wmsNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md border border-border px-3 py-2 text-sm text-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
