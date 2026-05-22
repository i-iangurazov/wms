import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject } from "@/server/http";
import { createWarehouse, listWarehouses } from "@/server/services/warehouseService";
import { warehouseInputSchema } from "@/lib/wmsSchemas";
import { parseServerSchema } from "@/server/validation";

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
    const warehouse = await createWarehouse(context, parseServerSchema(warehouseInputSchema, body));
    return jsonCreated({ warehouse });
  } catch (error) {
    return jsonError(error);
  }
}
