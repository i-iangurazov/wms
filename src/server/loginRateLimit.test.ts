import { describe, expect, it } from "vitest";
import { getRequestIp, isLoginRateLimited, normalizeLoginEmail } from "@/server/loginRateLimit";

describe("login rate limit helpers", () => {
  it("normalizes email before storing or checking attempts", () => {
    expect(normalizeLoginEmail("  OWNER@EXAMPLE.COM ")).toBe("owner@example.com");
  });

  it("blocks once failed attempts reach the configured threshold", () => {
    expect(isLoginRateLimited(4, 5)).toBe(false);
    expect(isLoginRateLimited(5, 5)).toBe(true);
    expect(isLoginRateLimited(6, 5)).toBe(true);
  });

  it("uses the first forwarded IP address", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    expect(getRequestIp(headers)).toBe("203.0.113.10");
  });
});
