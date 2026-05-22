import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { parseWarehouseStatus } from "@/server/enumParsing";
import { createZone, listZones } from "@/server/services/locationService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const warehouseId = request.nextUrl.searchParams.get("warehouseId") ?? undefined;
    const zones = await listZones(context, warehouseId);
    return jsonOk({ zones });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const zone = await createZone(context, {
      warehouseId: readString(body, "warehouseId"),
      code: readString(body, "code"),
      name: readString(body, "name"),
      status: parseWarehouseStatus(body.status, "ACTIVE")
    });
    return jsonCreated({ zone });
  } catch (error) {
    return jsonError(error);
  }
}
