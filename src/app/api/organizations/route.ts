import type { NextRequest } from "next/server";
import { getRequestContext } from "@/server/auth";
import { jsonCreated, jsonError, jsonOk, parseJsonObject, readString } from "@/server/http";
import { createOrganization, listCurrentUserOrganizations } from "@/server/services/organizationService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const organizations = await listCurrentUserOrganizations(context);
    return jsonOk({ organizations });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = await parseJsonObject(request);
    const organization = await createOrganization(context, {
      code: readString(body, "code"),
      name: readString(body, "name")
    });
    return jsonCreated({ organization });
  } catch (error) {
    return jsonError(error);
  }
}
