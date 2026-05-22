import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { deactivateProduct, updateProduct } from "@/server/services/productService";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const product = await updateProduct(context, params.id, {
      sku: readString(body, "sku"),
      name: readString(body, "name"),
      barcode: readString(body, "barcode", false)
    });
    return jsonOk({ product });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const product = await deactivateProduct(context, params.id);
    return jsonOk({ product });
  } catch (error) {
    return jsonError(error);
  }
}
