import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { resolveShortPickLine } from "@/server/services/pickingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const line = await resolveShortPickLine(context, {
      lineId: params.id,
      note: readString(body, "note", false) ?? null,
      idempotencyKey: readString(body, "idempotencyKey", false) ?? null
    });
    return jsonOk({ line });
  } catch (error) {
    return jsonError(error);
  }
}
