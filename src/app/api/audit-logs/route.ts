import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { listAuditLogs } from "@/server/services/auditService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const logs = await listAuditLogs(context, {
      action: request.nextUrl.searchParams.get("action") ?? undefined,
      entityType: request.nextUrl.searchParams.get("entityType") ?? undefined,
      userId: request.nextUrl.searchParams.get("userId") ?? undefined
    });
    return jsonOk({ logs });
  } catch (error) {
    return jsonError(error);
  }
}
