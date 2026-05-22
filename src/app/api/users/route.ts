import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { addStoreUser, listStoreUsers } from "@/server/services/userService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const users = await listStoreUsers(context);
    return jsonOk({ users });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const membership = await addStoreUser(context, {
      email: readString(body, "email"),
      name: readString(body, "name"),
      role: readString(body, "role"),
      initialPassword: readString(body, "initialPassword", false)
    });
    return jsonCreated({ user: membership });
  } catch (error) {
    return jsonError(error);
  }
}
