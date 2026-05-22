import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { createPickWorkFromOrder, listPickWork } from "@/server/services/pickingService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const work = await listPickWork(context);
    return jsonOk({ work });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const work = await createPickWorkFromOrder(context, {
      orderId: readString(body, "orderId"),
      warehouseId: readString(body, "warehouseId")
    });
    return jsonCreated({ work });
  } catch (error) {
    return jsonError(error);
  }
}
