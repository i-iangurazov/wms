import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject, readNumber, readString } from "@/server/http";
import { receiveLine } from "@/server/services/receivingService";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const line = await receiveLine(context, {
      lineId: readString(body, "lineId") || params.id,
      quantity: readNumber(body, "quantity"),
      idempotencyKey: readString(body, "idempotencyKey", false)
    });
    return jsonOk({ line });
  } catch (error) {
    return jsonError(error);
  }
}
