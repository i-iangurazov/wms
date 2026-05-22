import type { Prisma } from "@prisma/client";
import { AppError } from "@/server/errors";
import type { RequestContext } from "@/server/auth";

type StoreAccessClient = Pick<Prisma.TransactionClient, "storeUser">;

export async function assertStoreAccess(db: StoreAccessClient, context: RequestContext, storeId: string) {
  if (context.storeId !== storeId) {
    throw new AppError("Cross-store access is not allowed.", 403);
  }

  const storeUser = await db.storeUser.findUnique({
    where: { storeId_userId: { storeId, userId: context.user.id } }
  });
  if (!storeUser) {
    throw new AppError("User does not have access to this store.", 403);
  }
}
