import type { NextRequest } from "next/server";
import { AppError } from "@/server/errors";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import {
  allocateOrderStock,
  listOrderReservations,
  releaseOrderReservations
} from "@/server/services/reservationService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const orderId = request.nextUrl.searchParams.get("orderId") ?? undefined;
    const reservations = await listOrderReservations(context, { orderId });
    return jsonOk({ reservations });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const action = readString(body, "action");
    if (action === "allocate") {
      const reservations = await allocateOrderStock(context, {
        orderId: readString(body, "orderId"),
        warehouseId: readString(body, "warehouseId"),
        idempotencyKey: readString(body, "idempotencyKey", false) ?? null
      });
      return jsonCreated({ reservations });
    }
    if (action === "release") {
      const releasedCount = await releaseOrderReservations(context, {
        orderId: readString(body, "orderId"),
        note: readString(body, "note", false) ?? null,
        idempotencyKey: readString(body, "idempotencyKey", false) ?? null
      });
      return jsonOk({ releasedCount });
    }
    throw new AppError("Invalid reservation action.", 400);
  } catch (error) {
    return jsonError(error);
  }
}
