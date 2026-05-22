import { describe, expect, it, vi } from "vitest";
import type { RequestContext } from "@/server/auth";
import { assertStoreAccess } from "@/server/storeAccess";

type StoreAccessDb = Parameters<typeof assertStoreAccess>[0];

function contextFor(storeId: string): RequestContext {
  return {
    storeId,
    role: "OWNER",
    user: {
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      passwordHash: null,
      role: "OWNER",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };
}

describe("organization isolation guard", () => {
  it("rejects cross-organization access before reading memberships", async () => {
    const findUnique = vi.fn();

    await expect(
      assertStoreAccess({ storeUser: { findUnique } } as unknown as StoreAccessDb, contextFor("org-a"), "org-b")
    ).rejects.toMatchObject({ status: 403 });

    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects access when a membership does not exist in the organization", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);

    await expect(
      assertStoreAccess({ storeUser: { findUnique } } as unknown as StoreAccessDb, contextFor("org-a"), "org-a")
    ).rejects.toMatchObject({ status: 403 });

    expect(findUnique).toHaveBeenCalledWith({
      where: { storeId_userId: { storeId: "org-a", userId: "user-1" } }
    });
  });

  it("allows access only when the user has a membership in the organization", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "membership-1" });

    await expect(
      assertStoreAccess({ storeUser: { findUnique } } as unknown as StoreAccessDb, contextFor("org-a"), "org-a")
    ).resolves.toBeUndefined();
  });
});
