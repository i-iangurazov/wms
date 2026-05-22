import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readNumber, readString } from "@/server/http";
import {
  confirmPackLine,
  createPackWorkFromOrder,
  listPacking,
  markOrderReadyToShip
} from "@/server/services/packingService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const packing = await listPacking(context);
    return jsonOk(packing);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const action = readString(body, "action");
    if (action === "CREATE_WORK") {
      const work = await createPackWorkFromOrder(context, {
        orderId: readString(body, "orderId"),
        warehouseId: readString(body, "warehouseId")
      });
      return jsonCreated({ work });
    }
    if (action === "CONFIRM_LINE") {
      const line = await confirmPackLine(context, {
        lineId: readString(body, "lineId"),
        productScan: readString(body, "productScan"),
        quantity: readNumber(body, "quantity")
      });
      return jsonOk({ line });
    }
    if (action === "READY_TO_SHIP") {
      const order = await markOrderReadyToShip(context, readString(body, "orderId"));
      return jsonOk({ order });
    }
    throw new AppError("Invalid packing action.", 400);
  } catch (error) {
    return jsonError(error);
  }
}
