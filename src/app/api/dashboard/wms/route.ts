import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { getWmsDashboard } from "@/server/services/dashboardService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const dashboard = await getWmsDashboard(context);
    return jsonOk({ dashboard });
  } catch (error) {
    return jsonError(error);
  }
}
