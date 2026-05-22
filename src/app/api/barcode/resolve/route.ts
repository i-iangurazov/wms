import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { parseBarcodeEntityType, resolveBarcode } from "@/server/services/barcodeService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const result = await resolveBarcode(context, {
      scan: request.nextUrl.searchParams.get("scan") ?? "",
      expectedType: parseBarcodeEntityType(request.nextUrl.searchParams.get("type"))
    });
    return jsonOk({ result });
  } catch (error) {
    return jsonError(error);
  }
}
