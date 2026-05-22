import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, parseJsonObject, readNumber, readString } from "@/server/http";
import { addReceivingLine } from "@/server/services/receivingService";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const line = await addReceivingLine(context, {
      sessionId: params.id,
      productId: readString(body, "productId"),
      variantId: readString(body, "variantId", false),
      expectedQty: readNumber(body, "expectedQty", 0)
    });
    return jsonCreated({ line });
  } catch (error) {
    return jsonError(error);
  }
}
