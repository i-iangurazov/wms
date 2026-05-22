import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { submitCycleCount } from "@/server/services/cycleCountService";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const session = await submitCycleCount(context, params.id);
    return jsonOk({ session });
  } catch (error) {
    return jsonError(error);
  }
}
