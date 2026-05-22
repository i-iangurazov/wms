import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/authCookies";

const publicApiPrefixes = ["/api/auth", "/api/health"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);

  if (pathname.startsWith("/login") && hasSession) {
    return NextResponse.redirect(new URL("/wms", request.url));
  }

  if (pathname.startsWith("/wms") && !hasSession && process.env.ALLOW_DEV_AUTH_FALLBACK !== "true") {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith("/api") &&
    !publicApiPrefixes.some((prefix) => pathname.startsWith(prefix)) &&
    !hasSession &&
    process.env.ALLOW_DEV_AUTH_FALLBACK !== "true"
  ) {
    return NextResponse.json({ error: "Войдите в систему." }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/wms/:path*", "/login", "/api/:path*"]
};
