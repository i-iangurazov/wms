import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject } from "@/server/http";
import { createProduct, listProducts } from "@/server/services/productService";
import { productInputSchema } from "@/lib/wmsSchemas";
import { parseServerSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const products = await listProducts(context);
    return jsonOk({ products });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const product = await createProduct(context, parseServerSchema(productInputSchema, body));
    return jsonCreated({ product });
  } catch (error) {
    return jsonError(error);
  }
}
