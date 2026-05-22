import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject } from "@/server/http";
import {
  deactivateWarehouse,
  getWarehouse,
  updateWarehouse
} from "@/server/services/warehouseService";
import { warehouseInputSchema } from "@/lib/wmsSchemas";
import { parseServerSchema } from "@/server/validation";

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
    const warehouse = await updateWarehouse(context, params.id, parseServerSchema(warehouseInputSchema, body));
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
