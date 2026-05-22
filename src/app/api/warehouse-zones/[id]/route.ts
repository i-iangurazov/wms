import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { parseWarehouseStatus } from "@/server/enumParsing";
import { deactivateZone, updateZone } from "@/server/services/locationService";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const zone = await updateZone(context, params.id, {
      code: readString(body, "code", false),
      name: readString(body, "name", false),
      status: parseWarehouseStatus(body.status)
    });
    return jsonOk({ zone });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const zone = await deactivateZone(context, params.id);
    return jsonOk({ zone });
  } catch (error) {
    return jsonError(error);
  }
}
