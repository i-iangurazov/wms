import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import {
  jsonError,
  jsonOk,
  parseJsonObject,
  readBoolean,
  readString
} from "@/server/http";
import { parseLocationType, parseWarehouseStatus } from "@/server/enumParsing";
import { deactivateLocation, getLocation, updateLocation } from "@/server/services/locationService";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const location = await getLocation(context, params.id);
    return jsonOk({ location });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const zoneId =
      body.zoneId === null ? null : typeof body.zoneId === "string" && body.zoneId.trim() ? body.zoneId.trim() : undefined;
    const location = await updateLocation(context, params.id, {
      code: readString(body, "code", false),
      barcode: readString(body, "barcode", false) ?? null,
      zoneId,
      type: body.type === undefined ? undefined : parseLocationType(body.type),
      status: parseWarehouseStatus(body.status),
      isPickable: readBoolean(body, "isPickable"),
      isReceivable: readBoolean(body, "isReceivable"),
      isSellable: readBoolean(body, "isSellable")
    });
    return jsonOk({ location });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const location = await deactivateLocation(context, params.id);
    return jsonOk({ location });
  } catch (error) {
    return jsonError(error);
  }
}
