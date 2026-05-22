import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readNumber, readString } from "@/server/http";
import {
  confirmReplenishmentLine,
  createReplenishmentRule,
  deactivateReplenishmentRule,
  generateReplenishmentWork,
  listReplenishment
} from "@/server/services/replenishmentService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const replenishment = await listReplenishment(context);
    return jsonOk(replenishment);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const action = readString(body, "action");
    if (action === "CREATE_RULE") {
      const rule = await createReplenishmentRule(context, {
        warehouseId: readString(body, "warehouseId"),
        productId: readString(body, "productId"),
        pickLocationId: readString(body, "pickLocationId"),
        sourceLocationId: readString(body, "sourceLocationId", false),
        sourceZoneId: readString(body, "sourceZoneId", false),
        minQty: readNumber(body, "minQty"),
        maxQty: readNumber(body, "maxQty")
      });
      return jsonCreated({ rule });
    }
    if (action === "GENERATE_WORK") {
      const work = await generateReplenishmentWork(context, readString(body, "ruleId"));
      return jsonCreated({ work });
    }
    if (action === "CONFIRM_LINE") {
      const line = await confirmReplenishmentLine(context, {
        lineId: readString(body, "lineId"),
        sourceScan: readString(body, "sourceScan"),
        destinationScan: readString(body, "destinationScan"),
        productScan: readString(body, "productScan"),
        quantity: readNumber(body, "quantity")
      });
      return jsonOk({ line });
    }
    throw new AppError("Invalid replenishment action.", 400);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      throw new AppError("Replenishment rule id is required.", 400);
    }
    const rule = await deactivateReplenishmentRule(context, id);
    return jsonOk({ rule });
  } catch (error) {
    return jsonError(error);
  }
}
