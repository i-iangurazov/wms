import { createHash } from "node:crypto";
import type { InventoryMovementType, Prisma } from "@prisma/client";
import type { RequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";

function fingerprint(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function claimWorkflowCommand(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  input: {
    idempotencyKey?: string | null;
    operation: InventoryMovementType;
    payload: unknown;
  }
) {
  const key = input.idempotencyKey?.trim();
  if (!key) {
    return null;
  }
  if (key.length > 160) {
    throw new AppError("Idempotency key is too long.", 400);
  }
  const nextFingerprint = fingerprint(input.payload);
  const existing = await tx.stockCommand.findUnique({
    where: { storeId_idempotencyKey: { storeId: context.storeId, idempotencyKey: key } },
    include: { movement: true }
  });
  if (existing) {
    if (existing.fingerprint !== nextFingerprint) {
      throw new AppError("Idempotency key was already used for a different stock command.", 409);
    }
    if (!existing.movementId) {
      throw new AppError("Stock command is already being processed.", 409);
    }
    return { commandId: existing.id, replay: true };
  }
  const command = await tx.stockCommand.create({
    data: {
      storeId: context.storeId,
      idempotencyKey: key,
      fingerprint: nextFingerprint,
      operation: input.operation,
      createdById: context.user.id
    }
  });
  return { commandId: command.id, replay: false };
}

export async function attachWorkflowMovement(
  tx: Prisma.TransactionClient,
  commandId: string | undefined,
  movementId: string
) {
  if (!commandId) {
    return;
  }
  await tx.stockCommand.update({
    where: { id: commandId },
    data: { movementId }
  });
}
