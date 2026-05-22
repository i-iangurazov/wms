import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { removeStoreUser, updateStoreUserRole } from "@/server/services/userService";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const membership = await updateStoreUserRole(context, params.id, {
      role: readString(body, "role")
    });
    return jsonOk({ user: membership });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request);
    const membership = await removeStoreUser(context, params.id);
    return jsonOk({ user: membership });
  } catch (error) {
    return jsonError(error);
  }
}
