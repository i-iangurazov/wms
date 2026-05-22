import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/server/password";

describe("password hashing", () => {
  it("verifies the original password and rejects a different password", async () => {
    const hash = await hashPassword("SafePassword123!");

    await expect(verifyPassword("SafePassword123!", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword123!", hash)).resolves.toBe(false);
  });

  it("rejects weak seed or initial passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow("Password must be at least 10 characters.");
  });
});
