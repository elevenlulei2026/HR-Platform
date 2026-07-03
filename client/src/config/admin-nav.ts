import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Cog,
  LayoutDashboard,
  LifeBuoy,
  Settings2,
  Shield,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export type AdminNavLink = {
  title: string;
  description?: string;
  to: string;
  group: string;
  permission?: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type AdminNavTopItem =
  | { type: "link"; title: string; to: string; icon: React.ComponentType<{ className?: string }> }
  | {
      type: "mega";
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      columns: Array<{ title: string; links: AdminNavLink[] }>;
    };

export const adminTopNav: AdminNavTopItem[] = [
  { type: "link", title: "工作台", to: "/admin/dashboard", icon: LayoutDashboard },
  {
    type: "mega",
    title: "组织与员工",
    icon: Building2,
    columns: [
      {
        title: "组织岗位",
        links: [
          {
            title: "组织架构",
            description: "组织树与历史快照（asOfDate）",
            to: "/admin/org/structure",
            group: "组织岗位",
            permission: "organization:view",
            icon: Building2,
          },
          {
            title: "岗位体系",
            description: "岗位主数据与分类属性维护",
            to: "/admin/org/positions",
            group: "组织岗位",
            permission: "position:view",
            icon: BriefcaseBusiness,
          },
          {
            title: "编制管理",
            description: "部门编制计划、使用率与校验",
            to: "/admin/org/headcount",
            group: "组织岗位",
            permission: "headcount:view",
            icon: Settings2,
          },
        ],
      },
      {
        title: "员工主数据",
        links: [
          {
            title: "员工花名册",
            description: "列表 + 右侧抽屉档案（后续切片完善）",
            to: "/admin/employees/roster",
            group: "员工主数据",
            permission: "employee:roster:view",
            icon: ClipboardList,
          },
          {
            title: "汇报关系",
            description: "支持 asOfDate 历史查询（后续切片完善）",
            to: "/admin/employees/reporting-lines",
            group: "员工主数据",
            permission: "reporting-line:view",
            icon: ShieldCheck,
          },
        ],
      },
      {
        title: "入转调离",
        links: [
          {
            title: "入职办理",
            to: "/admin/onboarding",
            group: "入转调离",
            permission: "onboarding:view",
            icon: LifeBuoy,
          },
          {
            title: "人事异动",
            to: "/admin/movements",
            group: "入转调离",
            permission: "employee:movement:view",
            icon: LifeBuoy,
          },
          {
            title: "离职办理",
            to: "/admin/offboarding",
            group: "入转调离",
            permission: "offboarding:view",
            icon: LifeBuoy,
          },
          {
            title: "合同管理",
            to: "/admin/contracts",
            group: "入转调离",
            permission: "contract:view",
            icon: LifeBuoy,
          },
        ],
      },
    ],
  },
  {
    type: "mega",
    title: "平台",
    icon: Shield,
    columns: [
      {
        title: "协同流程",
        links: [
          {
            title: "流程配置",
            to: "/admin/platform/workflow",
            group: "协同流程",
            permission: "workflow:manage",
            icon: Workflow,
          },
          {
            title: "待办中心",
            to: "/admin/platform/tasks",
            group: "协同流程",
            permission: "workflow:task:view",
            icon: ClipboardList,
          },
        ],
      },
      {
        title: "权限与审计",
        links: [
          {
            title: "RBAC 权限",
            to: "/admin/platform/permissions",
            group: "权限与审计",
            permission: "permission:manage",
            icon: Shield,
          },
          {
            title: "审计日志",
            to: "/admin/platform/audit",
            group: "权限与审计",
            permission: "audit:view",
            icon: ShieldCheck,
          },
        ],
      },
      {
        title: "开发与运维",
        links: [
          {
            title: "健康检查",
            description: "真实调用 /api/v1/health（禁止 mock）",
            to: "/admin/dev/health",
            group: "开发与运维",
            icon: Cog,
          },
        ],
      },
    ],
  },
  { type: "link", title: "报表", to: "/admin/reports", icon: BarChart3 },
  { type: "link", title: "设置", to: "/admin/settings", icon: Cog },
];

export function flattenAdminNavLinks(): AdminNavLink[] {
  const out: AdminNavLink[] = [];
  for (const item of adminTopNav) {
    if (item.type === "mega") {
      for (const col of item.columns) {
        out.push(...col.links);
      }
    }
  }
  return out;
}

export function getAdminBreadcrumb(pathname: string): string[] {
  // 一级直达
  for (const item of adminTopNav) {
    if (item.type === "link" && item.to === pathname) return [item.title];
  }
  // Mega
  for (const item of adminTopNav) {
    if (item.type !== "mega") continue;
    for (const col of item.columns) {
      for (const link of col.links) {
        if (link.to === pathname) return [item.title, col.title, link.title];
      }
    }
  }
  return ["未定义页面"];
}

