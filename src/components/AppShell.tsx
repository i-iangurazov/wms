import { cookies } from "next/headers";
import { commonText, wmsNavItems } from "@/lib/wmsText";
import { sessionCookieName } from "@/lib/authCookies";
import { getSessionContext } from "@/server/session";
import { visibleWmsNavItems } from "@/server/routeAccess";
import { RouteAccessBoundary } from "@/components/RouteAccessBoundary";
import { MobileNavItem, NavItem } from "@/components/NavItem";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext(cookies().get(sessionCookieName)?.value);
  const navItems = session
    ? visibleWmsNavItems(session.role)
    : process.env.ALLOW_DEV_AUTH_FALLBACK === "true"
      ? wmsNavItems
      : [];

  return (
    <div className="wms-root min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-panel p-5 lg:block">
        <div className="mb-8 rounded-lg border border-border bg-surface p-4">
          <div className="text-lg font-semibold">{commonText.appName}</div>
          <div className="mt-1 text-sm leading-5 text-muted">{commonText.appSubtitle}</div>
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-border bg-panel/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-muted">{commonText.appName}</div>
            <div className="flex items-center gap-3">
              <div className="hidden text-xs text-muted sm:block">{commonText.storeScope}</div>
              <form action="/api/auth/logout" method="post">
                <button className="focus-ring rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface" type="submit">
                  Выйти
                </button>
              </form>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <MobileNavItem key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <RouteAccessBoundary role={session?.role ?? null}>{children}</RouteAccessBoundary>
        </main>
      </div>
    </div>
  );
}
