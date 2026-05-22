import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readNumber, readString } from "@/server/http";
import {
  confirmPutawayLine,
  generatePutawayWorkForSession,
  listPutawayWork,
  putAwayStock
} from "@/server/services/putawayService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const work = await listPutawayWork(context);
    return jsonOk({ work });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const action = readString(body, "action", false);
    if (action === "generate") {
      const work = await generatePutawayWorkForSession(context, readString(body, "sessionId"));
      return jsonCreated({ work });
    }
    if (action === "confirmLine") {
      const line = await confirmPutawayLine(context, {
        lineId: readString(body, "lineId"),
        toLocationId: readString(body, "toLocationId", false),
        quantity: readNumber(body, "quantity"),
        note: readString(body, "note", false),
        idempotencyKey: readString(body, "idempotencyKey", false)
      });
      return jsonOk({ line });
    }
    const movement = await putAwayStock(context, {
      fromLocationId: readString(body, "fromLocationId"),
      toLocationId: readString(body, "toLocationId"),
      productId: readString(body, "productId"),
      variantId: readString(body, "variantId", false),
      quantity: readNumber(body, "quantity"),
      note: readString(body, "note", false),
      idempotencyKey: readString(body, "idempotencyKey", false)
    });
    return jsonCreated({ movement });
  } catch (error) {
    return jsonError(error);
  }
}
