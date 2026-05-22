"use client";

import { usePathname } from "next/navigation";
import { AccessDenied } from "@/components/AccessDenied";
import { canRoleAccessWmsPath, type WmsRole } from "@/lib/permissionModel";

export function RouteAccessBoundary({ children, role }: { children: React.ReactNode; role: WmsRole | null }) {
  const pathname = usePathname();

  if (role && !canRoleAccessWmsPath(role, pathname)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
