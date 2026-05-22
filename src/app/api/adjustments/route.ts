import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import {
  jsonCreated,
  jsonError,
  parseJsonObject,
  readBoolean,
  readNumber,
  readString
} from "@/server/http";
import { parseAdjustmentReason } from "@/server/enumParsing";
import { parseAdjustmentTargetState } from "@/server/services/adjustmentRules";
import { adjustStock } from "@/server/services/adjustmentService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const movement = await adjustStock(context, {
      locationId: readString(body, "locationId"),
      productId: readString(body, "productId"),
      variantId: readString(body, "variantId", false),
      quantityDelta: readNumber(body, "quantityDelta"),
      reason: parseAdjustmentReason(body.reason),
      note: readString(body, "note", false),
      allowNegative: readBoolean(body, "allowNegative", false),
      targetState: parseAdjustmentTargetState(body.targetState),
      idempotencyKey: readString(body, "idempotencyKey", false)
    });
    return jsonCreated({ movement });
  } catch (error) {
    return jsonError(error);
  }
}
