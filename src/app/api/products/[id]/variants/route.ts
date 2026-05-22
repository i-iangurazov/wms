import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, parseJsonObject, readString } from "@/server/http";
import { createProductVariant } from "@/server/services/productService";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const variant = await createProductVariant(context, {
      productId: params.id,
      sku: readString(body, "sku"),
      name: readString(body, "name"),
      barcode: readString(body, "barcode", false)
    });
    return jsonCreated({ variant });
  } catch (error) {
    return jsonError(error);
  }
}
