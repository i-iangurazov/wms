import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, parseJsonObject } from "@/server/http";
import { createProductVariant } from "@/server/services/productService";
import { productInputSchema } from "@/lib/wmsSchemas";
import { parseServerSchema } from "@/server/validation";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const variant = await createProductVariant(context, {
      ...parseServerSchema(productInputSchema, body),
      productId: params.id,
    });
    return jsonCreated({ variant });
  } catch (error) {
    return jsonError(error);
  }
}
