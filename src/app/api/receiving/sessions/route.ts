import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import {
  createReceivingSession,
  listReceivingSessions
} from "@/server/services/receivingService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const sessions = await listReceivingSessions(context);
    return jsonOk({ sessions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const session = await createReceivingSession(context, {
      warehouseId: readString(body, "warehouseId"),
      receivingLocationId: readString(body, "receivingLocationId", false),
      reference: readString(body, "reference", false),
      note: readString(body, "note", false)
    });
    return jsonCreated({ session });
  } catch (error) {
    return jsonError(error);
  }
}
