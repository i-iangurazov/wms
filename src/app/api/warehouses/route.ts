import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { parseWarehouseStatus } from "@/server/enumParsing";
import { createWarehouse, listWarehouses } from "@/server/services/warehouseService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const warehouses = await listWarehouses(context);
    return jsonOk({ warehouses });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const warehouse = await createWarehouse(context, {
      code: readString(body, "code"),
      name: readString(body, "name"),
      status: parseWarehouseStatus(body.status, "ACTIVE")
    });
    return jsonCreated({ warehouse });
  } catch (error) {
    return jsonError(error);
  }
}
