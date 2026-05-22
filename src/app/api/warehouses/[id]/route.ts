import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { parseWarehouseStatus } from "@/server/enumParsing";
import {
  deactivateWarehouse,
  getWarehouse,
  updateWarehouse
} from "@/server/services/warehouseService";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const warehouse = await getWarehouse(context, params.id);
    return jsonOk({ warehouse });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const warehouse = await updateWarehouse(context, params.id, {
      code: readString(body, "code", false),
      name: readString(body, "name", false),
      status: parseWarehouseStatus(body.status)
    });
    return jsonOk({ warehouse });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const warehouse = await deactivateWarehouse(context, params.id);
    return jsonOk({ warehouse });
  } catch (error) {
    return jsonError(error);
  }
}
