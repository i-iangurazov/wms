import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import {
  createBarcodeLabel,
  exportBarcodeLabelsCsv,
  listBarcodeLabels
} from "@/server/services/barcodeLabelService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const labels = await listBarcodeLabels(context);
    if (request.nextUrl.searchParams.get("format") === "csv") {
      return new Response(exportBarcodeLabelsCsv(labels), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="barcode-labels.csv"'
        }
      });
    }
    return jsonOk({ labels });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const label = await createBarcodeLabel(context, {
      code: readString(body, "code"),
      type: readString(body, "type"),
      targetId: readString(body, "targetId"),
      note: readString(body, "note", false)
    });
    return jsonCreated({ label });
  } catch (error) {
    return jsonError(error);
  }
}
