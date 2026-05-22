import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { importProductsFromCsv } from "@/server/services/productImportService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const result = await importProductsFromCsv(context, readString(body, "csv"));
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
