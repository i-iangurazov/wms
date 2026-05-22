import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { completeReceivingSession } from "@/server/services/receivingService";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const session = await completeReceivingSession(context, params.id);
    return jsonOk({ session });
  } catch (error) {
    return jsonError(error);
  }
}
