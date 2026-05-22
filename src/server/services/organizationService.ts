import { prisma } from "@/server/db";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { requirePermission } from "@/server/permissions";
import { writeAuditLog } from "@/server/services/auditService";

function assertCode(value: string) {
  const code = value.trim().toUpperCase();
  if (!code) {
    throw new AppError("Organization code is required.", 400);
  }
  if (code.length > 40) {
    throw new AppError("Organization code is too long.", 400);
  }
  return code;
}

function assertName(value: string) {
  const name = value.trim();
  if (!name) {
    throw new AppError("Organization name is required.", 400);
  }
  if (name.length > 120) {
    throw new AppError("Organization name is too long.", 400);
  }
  return name;
}

export async function listCurrentUserOrganizations(context: RequestContext) {
  return prisma.storeUser.findMany({
    where: { userId: context.user.id, store: { active: true } },
    include: { store: true },
    orderBy: { store: { name: "asc" } }
  });
}

export async function createOrganization(context: RequestContext, input: { code: string; name: string }) {
  requirePermission(context.role, "WMS_MANAGE_USERS");
  const code = assertCode(input.code);
  const name = assertName(input.name);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.store.findUnique({ where: { code } });
    if (existing) {
      throw new AppError("Organization code already exists.", 409);
    }
    const store = await tx.store.create({ data: { code, name } });
    const membership = await tx.storeUser.create({
      data: { storeId: store.id, userId: context.user.id, role: "OWNER" },
      include: { store: true, user: true }
    });
    await writeAuditLog(tx, {
      storeId: store.id,
      userId: context.user.id,
      action: "organization.create",
      entityType: "Store",
      entityId: store.id,
      metadata: { code: store.code, name: store.name }
    });
    return membership;
  });
}
