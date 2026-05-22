import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { getSettingsOverview } from "@/server/services/settingsService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const overview = await getSettingsOverview(context);
    return jsonOk({ overview });
  } catch (error) {
    return jsonError(error);
  }
}
