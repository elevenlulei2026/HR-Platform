import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KeyRound, LayoutGrid, Shield, Users } from "lucide-react";

import { usePermission } from "@/hooks/usePermission";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoPermissionCard, PageHeader } from "@/components/admin/page-shell";
import { MenuManagementTab } from "@/pages/admin/platform/permissions/MenuManagementTab";
import { PermissionCatalogTab } from "@/pages/admin/platform/permissions/PermissionCatalogTab";
import { RoleAuthorizationTab } from "@/pages/admin/platform/permissions/RoleAuthorizationTab";

type PermTab = "roles" | "menus" | "catalog";

const PERM_TABS: PermTab[] = ["roles", "menus", "catalog"];

export function AdminPermissionsPage() {
  const perm = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: PermTab = PERM_TABS.includes(tabParam as PermTab)
    ? (tabParam as PermTab)
    : "roles";
  const [tab, setTab] = useState<PermTab>(initialTab);

  const canManage = perm.has("permission:manage");

  const handleTabChange = (value: string) => {
    const next = value as PermTab;
    setTab(next);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", next);
      return p;
    });
  };

  const tabMeta = useMemo(
    () => ({
      roles: {
        label: "角色授权",
        icon: Users,
        description: "配置角色数据范围，并按菜单分组分配功能权限",
      },
      menus: {
        label: "菜单管理",
        icon: LayoutGrid,
        description: "维护顶栏导航菜单，与路由和可见性联动",
      },
      catalog: {
        label: "权限目录",
        icon: KeyRound,
        description: "维护权限点，使用向导自动生成标准 code",
      },
    }),
    [],
  );

  if (!canManage) {
    return (
      <NoPermissionCard
        icon={<Shield className="size-5 text-muted-foreground" />}
        title="无权限访问"
        description="需要权限点 permission:manage 才能管理 RBAC。"
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="权限中心"
        description="参考成熟 HR SaaS：角色授权、菜单管理、权限目录三位一体，降低配置成本。"
      />

      <Tabs value={tab} onValueChange={handleTabChange} className="gap-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/40 p-1">
          {PERM_TABS.map((key) => {
            const meta = tabMeta[key];
            const Icon = meta.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5 px-3 py-2">
                <Icon className="size-3.5 opacity-70" />
                {meta.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <p className="text-xs text-muted-foreground">{tabMeta[tab].description}</p>

        <TabsContent value="roles" className="mt-0">
          <RoleAuthorizationTab />
        </TabsContent>
        <TabsContent value="menus" className="mt-0">
          <MenuManagementTab />
        </TabsContent>
        <TabsContent value="catalog" className="mt-0">
          <PermissionCatalogTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
