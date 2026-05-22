import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { getInventoryReconciliation } from "@/server/services/reconciliationService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const reconciliation = await getInventoryReconciliation(context);
    return jsonOk({ reconciliation });
  } catch (error) {
    return jsonError(error);
  }
}
