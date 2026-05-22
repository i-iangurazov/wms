import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import {
  jsonCreated,
  jsonError,
  jsonOk,
  parseJsonObject,
  readBoolean,
  readString
} from "@/server/http";
import { parseLocationType, parseWarehouseStatus } from "@/server/enumParsing";
import { createLocation, listLocations } from "@/server/services/locationService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const warehouseId = request.nextUrl.searchParams.get("warehouseId") ?? undefined;
    const locations = await listLocations(context, warehouseId);
    return jsonOk({ locations });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const type = parseLocationType(body.type);
    const location = await createLocation(context, {
      warehouseId: readString(body, "warehouseId"),
      zoneId: readString(body, "zoneId", false),
      code: readString(body, "code"),
      barcode: readString(body, "barcode", false),
      type,
      status: parseWarehouseStatus(body.status, "ACTIVE"),
      isPickable: readBoolean(body, "isPickable", type === "PICKING"),
      isReceivable: readBoolean(body, "isReceivable", type === "RECEIVING" || type === "RETURNS"),
      isSellable: readBoolean(body, "isSellable", type === "PICKING")
    });
    return jsonCreated({ location });
  } catch (error) {
    return jsonError(error);
  }
}
