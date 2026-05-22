import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { middleware } from "@/middleware";
import { sessionCookieName } from "@/lib/authCookies";

const originalDevFallback = process.env.ALLOW_DEV_AUTH_FALLBACK;

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(`http://localhost${path}`), {
    headers: cookie ? { cookie } : undefined
  });
}

afterEach(() => {
  if (originalDevFallback === undefined) {
    delete process.env.ALLOW_DEV_AUTH_FALLBACK;
  } else {
    process.env.ALLOW_DEV_AUTH_FALLBACK = originalDevFallback;
  }
});

describe("middleware route protection", () => {
  it("redirects unauthenticated WMS pages to login", () => {
    process.env.ALLOW_DEV_AUTH_FALLBACK = "false";
    const response = middleware(request("/wms/receiving"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Fwms%2Freceiving");
  });

  it("returns Russian 401 for private APIs without a session", async () => {
    process.env.ALLOW_DEV_AUTH_FALLBACK = "false";
    const response = middleware(request("/api/products"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Войдите в систему." });
  });

  it("allows public auth and health APIs without a session", () => {
    process.env.ALLOW_DEV_AUTH_FALLBACK = "false";
    expect(middleware(request("/api/auth/login")).status).toBe(200);
    expect(middleware(request("/api/health")).status).toBe(200);
  });

  it("redirects logged-in users away from login", () => {
    process.env.ALLOW_DEV_AUTH_FALLBACK = "false";
    const response = middleware(request("/login", `${sessionCookieName}=token`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/wms");
  });

  it("allows local fallback only when explicitly enabled", () => {
    process.env.ALLOW_DEV_AUTH_FALLBACK = "true";
    expect(middleware(request("/api/products")).status).toBe(200);
  });
});
