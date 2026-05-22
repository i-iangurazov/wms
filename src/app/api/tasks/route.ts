import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { getTaskCenter } from "@/server/services/taskCenterService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const taskCenter = await getTaskCenter(context);
    return jsonOk({ taskCenter });
  } catch (error) {
    return jsonError(error);
  }
}
