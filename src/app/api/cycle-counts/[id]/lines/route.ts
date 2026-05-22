import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject, readNumber, readString } from "@/server/http";
import { updateCycleCountLine } from "@/server/services/cycleCountService";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const line = await updateCycleCountLine(context, {
      lineId: readString(body, "lineId") || params.id,
      countedQty: readNumber(body, "countedQty")
    });
    return jsonOk({ line });
  } catch (error) {
    return jsonError(error);
  }
}
