import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readNumber, readString } from "@/server/http";
import {
  createLocationDirective,
  createWorkTemplate,
  deactivateLocationDirective,
  deactivateWorkTemplate,
  listWarehouseRules
} from "@/server/services/warehouseRuleService";
import { AppError } from "@/server/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const rules = await listWarehouseRules(context);
    return jsonOk(rules);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const kind = readString(body, "kind");
    if (kind === "WORK_TEMPLATE") {
      const template = await createWorkTemplate(context, {
        warehouseId: readString(body, "warehouseId"),
        type: readString(body, "type"),
        name: readString(body, "name"),
        priority: readNumber(body, "priority", 100)
      });
      return jsonCreated({ template });
    }
    if (kind === "LOCATION_DIRECTIVE") {
      const directive = await createLocationDirective(context, {
        warehouseId: readString(body, "warehouseId"),
        type: readString(body, "type"),
        name: readString(body, "name"),
        priority: readNumber(body, "priority", 100),
        zoneId: readString(body, "zoneId", false),
        locationId: readString(body, "locationId", false)
      });
      return jsonCreated({ directive });
    }
    throw new AppError("Invalid warehouse rule kind.", 400);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const id = searchParams.get("id");
    if (!id) {
      throw new AppError("Warehouse rule id is required.", 400);
    }
    if (kind === "WORK_TEMPLATE") {
      const template = await deactivateWorkTemplate(context, id);
      return jsonOk({ template });
    }
    if (kind === "LOCATION_DIRECTIVE") {
      const directive = await deactivateLocationDirective(context, id);
      return jsonOk({ directive });
    }
    throw new AppError("Invalid warehouse rule kind.", 400);
  } catch (error) {
    return jsonError(error);
  }
}
