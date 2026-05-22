import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    return jsonOk({
      user: {
        id: context.user.id,
        name: context.user.name,
        email: context.user.email
      },
      context: {
        storeId: context.storeId,
        role: context.role
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
