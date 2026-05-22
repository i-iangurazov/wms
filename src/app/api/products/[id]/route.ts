import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonError, jsonOk, parseJsonObject } from "@/server/http";
import { deactivateProduct, updateProduct } from "@/server/services/productService";
import { productInputSchema } from "@/lib/wmsSchemas";
import { parseServerSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const product = await updateProduct(context, params.id, parseServerSchema(productInputSchema, body));
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
