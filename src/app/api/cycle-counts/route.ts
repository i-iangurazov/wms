import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { createCycleCount, listCycleCounts } from "@/server/services/cycleCountService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const sessions = await listCycleCounts(context);
    return jsonOk({ sessions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const session = await createCycleCount(context, {
      warehouseId: readString(body, "warehouseId"),
      locationId: readString(body, "locationId")
    });
    return jsonCreated({ session });
  } catch (error) {
    return jsonError(error);
  }
}
