import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { listInventoryBalances } from "@/server/services/stockMovementService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const balances = await listInventoryBalances(context, {
      warehouseId: request.nextUrl.searchParams.get("warehouseId") ?? undefined,
      locationId: request.nextUrl.searchParams.get("locationId") ?? undefined,
      productId: request.nextUrl.searchParams.get("productId") ?? undefined
    });
    return jsonOk({ balances });
  } catch (error) {
    return jsonError(error);
  }
}
