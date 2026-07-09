import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { getRoutePermission } from "@/config/admin-routes";
import { NoPermissionCard } from "@/components/admin/page-shell";
import { usePermission } from "@/hooks/usePermission";
import { Shield } from "lucide-react";

type RequirePermissionProps = {
  /** 显式指定权限点；未指定时从当前路由解析 */
  permission?: string;
  title?: string;
  description?: string;
  children: ReactNode;
};

export function RequirePermission(props: RequirePermissionProps) {
  const location = useLocation();
  const perm = usePermission();
  const code = props.permission ?? getRoutePermission(location.pathname);

  if (!perm.has(code)) {
    return (
      <NoPermissionCard
        icon={<Shield className="size-8 text-muted-foreground" />}
        title={props.title ?? "无访问权限"}
        description={
          props.description ??
          (code ? `需要 ${code} 权限才能访问此页面` : "当前账号无权访问此页面")
        }
      />
    );
  }

  return props.children;
}
