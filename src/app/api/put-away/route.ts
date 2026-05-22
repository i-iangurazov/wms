import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, parseJsonObject, readNumber, readString } from "@/server/http";
import { putAwayStock } from "@/server/services/putawayService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
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
