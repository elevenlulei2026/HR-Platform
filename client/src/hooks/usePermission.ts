import { useMemo } from "react";

import { useAuth } from "@/auth/AuthProvider";

export type PermissionCheck = {
  has: (permissionCode?: string) => boolean;
  assert: (permissionCode: string, message?: string) => void;
  permissions: Set<string>;
  roles: Set<string>;
};

export function usePermission(): PermissionCheck {
  const { user } = useAuth();

  const permissions = useMemo<Set<string>>(() => new Set(user?.permissions || []), [user]);
  const roles = useMemo<Set<string>>(() => new Set(user?.roles || []), [user]);

  return useMemo<PermissionCheck>(() => {
    return {
      permissions,
      roles,
      has: (permissionCode?: string) => {
        if (!permissionCode) return true; // 未配置 permission 的菜单/按钮，默认允许显示
        return permissions.has(permissionCode);
      },
      assert: (permissionCode: string, message?: string) => {
        if (!permissions.has(permissionCode)) {
          throw new Error(message || "无权限");
        }
      },
    };
  }, [permissions, roles]);
}

