import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Cog,
  Database,
  LayoutDashboard,
  LifeBuoy,
  Network,
  Settings2,
  Shield,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { getArchiveDataResource } from "@/config/archive-data-resources";
import { ARCHIVE_DATA_HUB_VIEW_PERMISSIONS } from "@/config/archive-permissions";

export type AdminNavLink = {
  title: string;
  description?: string;
  to: string;
  group: string;
  /** 单一权限点；与 anyOfPermissions 二选一 */
  permission?: string;
  /** 任一权限即可展示（如管理数据入口） */
  anyOfPermissions?: readonly string[];
  icon: React.ComponentType<{ className?: string }>;
};

export type AdminNavColumn = {
  title: string;
  links: AdminNavLink[];
  /** @deprecated Mega 不再展开嵌套分区；保留类型以兼容旧动态菜单数据 */
  sections?: Array<{ title: string; links: AdminNavLink[] }>;
};

export type AdminNavTopItem =
  | {
      type: "link";
      title: string;
      to: string;
      permission?: string;
      icon: React.ComponentType<{ className?: string }>;
    }
  | {
      type: "mega";
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      columns: AdminNavColumn[];
    };

export const adminTopNav: AdminNavTopItem[] = [
  {
    type: "link",
    title: "工作台",
    to: "/admin/dashboard",
    permission: "dashboard:view",
    icon: LayoutDashboard,
  },
  {
    type: "mega",
    title: "组织与员工",
    icon: Building2,
    columns: [
      {
        title: "组织岗位",
        links: [
          {
            title: "组织管理",
            description: "维护组织层级、关键属性与历史快照",
            to: "/admin/org/structure",
            group: "组织岗位",
            permission: "organization:view",
            icon: Building2,
          },
          {
            title: "组织图",
            description: "图形化浏览组织树，下钻查看岗位与人员",
            to: "/admin/org/chart",
            group: "组织岗位",
            permission: "organization:view",
            icon: Network,
          },
          {
            title: "岗位体系",
            description: "统一维护岗位信息、分类与任职要求",
            to: "/admin/org/positions",
            group: "组织岗位",
            permission: "position:view",
            icon: BriefcaseBusiness,
          },
          {
            title: "编制管理",
            description: "规划部门编制并跟踪占用与使用率",
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
            description: "集中查询员工信息并快速查看完整档案",
            to: "/admin/employees/roster",
            group: "员工主数据",
            permission: "employee:roster:view",
            icon: ClipboardList,
          },
          {
            title: "汇报关系",
            description: "维护员工汇报关系并按日期查看历史",
            to: "/admin/employees/reporting-lines",
            group: "员工主数据",
            permission: "reporting-line:view",
            icon: ShieldCheck,
          },
          {
            title: "管理数据",
            description: "跨员工批量维护证件、合同、协议等档案",
            to: "/admin/employees/data",
            group: "员工主数据",
            anyOfPermissions: ARCHIVE_DATA_HUB_VIEW_PERMISSIONS,
            icon: Database,
          },
        ],
      },
      {
        title: "入转调离",
        links: [
          {
            title: "入职办理",
            description: "管理入职资料、流程与办理进度",
            to: "/admin/onboarding",
            group: "入转调离",
            permission: "onboarding:view",
            icon: LifeBuoy,
          },
          {
            title: "人事异动",
            description: "办理转岗、调动等员工任职变更",
            to: "/admin/movements",
            group: "入转调离",
            permission: "employee:movement:view",
            icon: LifeBuoy,
          },
          {
            title: "离职办理",
            description: "管理离职流程、交接与状态变更",
            to: "/admin/offboarding",
            group: "入转调离",
            permission: "offboarding:view",
            icon: LifeBuoy,
          },
          {
            title: "合同管理",
            description: "维护劳动合同信息与到期续签",
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
            description: "配置审批流程定义与节点规则",
            to: "/admin/platform/workflow",
            group: "协同流程",
            permission: "workflow:manage",
            icon: Workflow,
          },
          {
            title: "待办中心",
            description: "处理待办任务并跟踪审批进度",
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
            description: "管理角色、菜单与功能权限",
            to: "/admin/platform/permissions",
            group: "权限与审计",
            permission: "permission:manage",
            icon: Shield,
          },
          {
            title: "审计日志",
            description: "查询系统关键操作与安全审计记录",
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
            description: "查看服务健康状态与接口联通情况",
            to: "/admin/dev/health",
            group: "开发与运维",
            permission: "dev:health:view",
            icon: Cog,
          },
        ],
      },
    ],
  },
  { type: "link", title: "报表", to: "/admin/reports", permission: "report:view", icon: BarChart3 },
  { type: "link", title: "设置", to: "/admin/settings", permission: "settings:view", icon: Cog },
];

export function flattenAdminNavLinks(): AdminNavLink[] {
  const out: AdminNavLink[] = [];
  for (const item of adminTopNav) {
    if (item.type === "mega") {
      for (const col of item.columns) {
        out.push(...col.links);
        if (col.sections) {
          for (const sec of col.sections) {
            out.push(...sec.links);
          }
        }
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
      if (col.sections) {
        for (const sec of col.sections) {
          for (const link of sec.links) {
            if (link.to === pathname) return [item.title, col.title, sec.title, link.title];
          }
        }
      }
    }
  }
  // 管理数据资源页（产品内导航，不挂 Mega 子项）
  if (pathname === "/admin/employees/data") {
    return ["组织与员工", "员工主数据", "管理数据"];
  }
  const dataMatch = pathname.match(/^\/admin\/employees\/data\/([a-z0-9-]+)$/);
  if (dataMatch) {
    const title = getArchiveDataResource(dataMatch[1])?.title ?? dataMatch[1];
    return ["组织与员工", "员工主数据", "管理数据", title];
  }
  return ["未定义页面"];
}

