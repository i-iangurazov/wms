import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readNumber, readString } from "@/server/http";
import { createCustomerOrder, listCustomerOrders } from "@/server/services/orderService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const orders = await listCustomerOrders(context);
    return jsonOk({ orders });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const order = await createCustomerOrder(context, {
      number: readString(body, "number"),
      productId: readString(body, "productId"),
      variantId: readString(body, "variantId", false),
      quantity: readNumber(body, "quantity")
    });
    return jsonCreated({ order });
  } catch (error) {
    return jsonError(error);
  }
}
