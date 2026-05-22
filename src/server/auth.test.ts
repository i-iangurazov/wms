import { describe, expect, it } from "vitest";
import { canUseDevAuthFallback } from "@/server/auth";

describe("canUseDevAuthFallback", () => {
  it("blocks fallback by default in every environment", () => {
    expect(canUseDevAuthFallback({ NODE_ENV: "development" })).toBe(false);
    expect(canUseDevAuthFallback({ NODE_ENV: "test" })).toBe(false);
    expect(canUseDevAuthFallback({ NODE_ENV: "production" })).toBe(false);
  });

  it("allows explicit local override and supports explicit disable", () => {
    expect(canUseDevAuthFallback({ NODE_ENV: "production", ALLOW_DEV_AUTH_FALLBACK: "true" })).toBe(true);
    expect(canUseDevAuthFallback({ NODE_ENV: "development", ALLOW_DEV_AUTH_FALLBACK: "false" })).toBe(false);
  });
});
