import type { ReactNode } from "react";

import { usePermission } from "@/hooks/usePermission";

type CanProps = {
  permission?: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
};

/** 按权限点条件渲染（未配置 permission 时默认显示） */
export function Can(props: CanProps) {
  const perm = usePermission();
  const codes = props.permission == null
    ? undefined
    : Array.isArray(props.permission)
      ? props.permission
      : [props.permission];

  const allowed =
    codes == null
      ? true
      : codes.some((code) => perm.has(code));

  if (!allowed) {
    return props.fallback ?? null;
  }

  return props.children;
}
