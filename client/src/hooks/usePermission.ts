import { useMemo } from "react";

import { useAuth } from "@/auth/AuthProvider";

export type PermissionCheck = {
  has: (permissionCode?: string) => boolean;
  hasAny: (...permissionCodes: string[]) => boolean;
  assert: (permissionCode: string, message?: string) => void;
  permissions: Set<string>;
  roles: Set<string>;
  dataScope?: string;
};

export function usePermission(): PermissionCheck {
  const { user } = useAuth();

  const permissions = useMemo<Set<string>>(() => new Set(user?.permissions || []), [user]);
  const roles = useMemo<Set<string>>(() => new Set(user?.roles || []), [user]);

  return useMemo<PermissionCheck>(() => {
    return {
      permissions,
      roles,
      dataScope: user?.dataScope,
      has: (permissionCode?: string) => {
        if (!permissionCode) return true;
        return permissions.has(permissionCode);
      },
      hasAny: (...permissionCodes: string[]) => {
        return permissionCodes.some((code) => code && permissions.has(code));
      },
      assert: (permissionCode: string, message?: string) => {
        if (!permissions.has(permissionCode)) {
          throw new Error(message || "无权限");
        }
      },
    };
  }, [permissions, roles, user?.dataScope]);
}

