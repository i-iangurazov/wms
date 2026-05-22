import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { hashPassword } from "@/server/password";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";

const validRoles: Role[] = [
  "OWNER",
  "ADMIN",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_WORKER",
  "VIEWER",
  "MANAGER",
  "STAFF",
  "CASHIER"
];
const adminRoles: Role[] = ["OWNER", "ADMIN"];

function assertRole(value: string): Role {
  if (!validRoles.includes(value as Role)) {
    throw new AppError("Invalid user role.", 400);
  }
  return value as Role;
}

function assertEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) {
    throw new AppError("User email is required.", 400);
  }
  if (email.length > 180) {
    throw new AppError("User email is too long.", 400);
  }
  if (!email.includes("@")) {
    throw new AppError("User email is invalid.", 400);
  }
  return email;
}

function assertName(value: string) {
  const name = value.trim();
  if (!name) {
    throw new AppError("User name is required.", 400);
  }
  if (name.length > 120) {
    throw new AppError("User name is too long.", 400);
  }
  return name;
}

function assertInitialPassword(value: string | undefined) {
  const password = value?.trim() ?? "";
  if (!password) {
    throw new AppError("Initial password is required for a new user.", 400);
  }
  if (password.length < 10) {
    throw new AppError("Password must be at least 10 characters.", 400);
  }
  return password;
}

async function assertNotLastAdmin(tx: Prisma.TransactionClient, storeId: string, membershipId: string) {
  const membership = await tx.storeUser.findFirst({
    where: { id: membershipId, storeId },
    include: { user: true }
  });
  if (!membership) {
    throw new AppError("User membership not found.", 404);
  }
  if (!adminRoles.includes(membership.role)) {
    return membership;
  }
  const adminCount = await tx.storeUser.count({ where: { storeId, role: { in: adminRoles } } });
  if (adminCount <= 1) {
    throw new AppError("Cannot remove the last organization admin.", 409);
  }
  return membership;
}

export async function listStoreUsers(context: RequestContext) {
  requirePermission(context.role, "WMS_MANAGE_USERS");
  return prisma.storeUser.findMany({
    where: { storeId: context.storeId },
    include: { user: true },
    orderBy: [{ role: "asc" }, { user: { email: "asc" } }]
  });
}

export async function addStoreUser(
  context: RequestContext,
  input: { email: string; name: string; role: string; initialPassword?: string }
) {
  requirePermission(context.role, "WMS_MANAGE_USERS");
  const email = assertEmail(input.email);
  const name = assertName(input.name);
  const role = assertRole(input.role);

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email } });
    if (!user) {
      const initialPassword = assertInitialPassword(input.initialPassword);
      user = await tx.user.create({
        data: {
          email,
          name,
          role,
          passwordHash: await hashPassword(initialPassword)
        }
      });
    }
    const existingMembership = await tx.storeUser.findUnique({
      where: { storeId_userId: { storeId: context.storeId, userId: user.id } }
    });
    if (existingMembership) {
      throw new AppError("User already has access to this organization.", 409);
    }

    const membership = await tx.storeUser.create({
      data: { storeId: context.storeId, userId: user.id, role },
      include: { user: true }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "store_user.create",
      entityType: "StoreUser",
      entityId: membership.id,
      metadata: { email: user.email, role: membership.role }
    });
    return membership;
  });
}

export async function updateStoreUserRole(
  context: RequestContext,
  membershipId: string,
  input: { role: string }
) {
  requirePermission(context.role, "WMS_MANAGE_USERS");
  const role = assertRole(input.role);

  return prisma.$transaction(async (tx) => {
    const membership = await tx.storeUser.findFirst({
      where: { id: membershipId, storeId: context.storeId },
      include: { user: true }
    });
    if (!membership) {
      throw new AppError("User membership not found.", 404);
    }
    if (adminRoles.includes(membership.role) && !adminRoles.includes(role)) {
      const adminCount = await tx.storeUser.count({ where: { storeId: context.storeId, role: { in: adminRoles } } });
      if (adminCount <= 1) {
        throw new AppError("Cannot remove the last organization admin.", 409);
      }
    }

    const updated = await tx.storeUser.update({
      where: { id: membership.id },
      data: { role },
      include: { user: true }
    });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "store_user.update_role",
      entityType: "StoreUser",
      entityId: updated.id,
      metadata: { email: updated.user.email, beforeRole: membership.role, afterRole: updated.role }
    });
    return updated;
  });
}

export async function removeStoreUser(context: RequestContext, membershipId: string) {
  requirePermission(context.role, "WMS_MANAGE_USERS");
  return prisma.$transaction(async (tx) => {
    const membership = await assertNotLastAdmin(tx, context.storeId, membershipId);
    await tx.storeUser.delete({ where: { id: membership.id } });
    await writeAuditLog(tx, {
      storeId: context.storeId,
      userId: context.user.id,
      action: "store_user.remove",
      entityType: "StoreUser",
      entityId: membership.id,
      metadata: { email: membership.user.email, role: membership.role }
    });
    return membership;
  });
}
