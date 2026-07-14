import type { PermissionAction } from "@shared/api.interface";

export type CatalogAction = {
  code: PermissionAction | string;
  label: string;
};

export type CatalogResource = {
  code: string;
  label: string;
  actions: CatalogAction[];
};

export type CatalogModule = {
  code: string;
  label: string;
  resources: CatalogResource[];
};

/** 权限向导：模块 → 资源 → 操作，自动生成 code */
export const PERMISSION_CATALOG: CatalogModule[] = [
  {
    code: "dashboard",
    label: "工作台",
    resources: [{ code: "dashboard", label: "工作台", actions: [{ code: "view", label: "查看" }] }],
  },
  {
    code: "organization",
    label: "组织架构",
    resources: [
      {
        code: "organization",
        label: "组织树",
        actions: [
          { code: "view", label: "查看" },
          { code: "create", label: "新建" },
          { code: "edit", label: "编辑" },
          { code: "delete", label: "删除" },
        ],
      },
    ],
  },
  {
    code: "position",
    label: "岗位体系",
    resources: [
      {
        code: "position",
        label: "岗位",
        actions: [
          { code: "view", label: "查看" },
          { code: "create", label: "新建" },
          { code: "edit", label: "编辑" },
          { code: "delete", label: "删除" },
        ],
      },
    ],
  },
  {
    code: "headcount",
    label: "编制管理",
    resources: [
      {
        code: "headcount",
        label: "编制",
        actions: [
          { code: "view", label: "查看" },
          { code: "create", label: "新建" },
          { code: "edit", label: "编辑" },
          { code: "delete", label: "删除" },
        ],
      },
    ],
  },
  {
    code: "employee",
    label: "员工",
    resources: [
      {
        code: "roster",
        label: "花名册",
        actions: [
          { code: "view", label: "查看" },
          { code: "create", label: "新建" },
          { code: "edit", label: "编辑" },
          { code: "delete", label: "删除" },
          { code: "import", label: "导入" },
          { code: "export", label: "导出" },
        ],
      },
      ...(["personal", "work", "service", "background", "development"] as const).map(
        (section) => ({
          code: `archive:${section}`,
          label: `档案-${archiveSectionLabel(section)}`,
          actions: [
            { code: "view", label: "查看" },
            { code: "create", label: "新建" },
            { code: "edit", label: "编辑" },
            { code: "delete", label: "删除" },
            { code: "import", label: "导入" },
            { code: "export", label: "导出" },
          ],
        }),
      ),
      {
        code: "movement",
        label: "人事异动",
        actions: [{ code: "view", label: "查看" }, { code: "edit", label: "编辑" }],
      },
    ],
  },
  {
    code: "reporting-line",
    label: "汇报关系",
    resources: [
      {
        code: "reporting-line",
        label: "汇报关系",
        actions: [
          { code: "view", label: "查看" },
          { code: "create", label: "新建" },
          { code: "edit", label: "编辑" },
          { code: "delete", label: "删除" },
        ],
      },
    ],
  },
  {
    code: "onboarding",
    label: "入职办理",
    resources: [{ code: "onboarding", label: "入职", actions: [{ code: "view", label: "查看" }, { code: "edit", label: "编辑" }] }],
  },
  {
    code: "offboarding",
    label: "离职办理",
    resources: [{ code: "offboarding", label: "离职", actions: [{ code: "view", label: "查看" }, { code: "edit", label: "编辑" }] }],
  },
  {
    code: "contract",
    label: "合同管理",
    resources: [{ code: "contract", label: "合同", actions: [{ code: "view", label: "查看" }, { code: "edit", label: "编辑" }] }],
  },
  {
    code: "workflow",
    label: "流程协同",
    resources: [
      { code: "workflow", label: "流程配置", actions: [{ code: "manage", label: "管理" }] },
      { code: "task", label: "待办中心", actions: [{ code: "view", label: "查看" }] },
    ],
  },
  {
    code: "permission",
    label: "权限中心",
    resources: [{ code: "permission", label: "权限", actions: [{ code: "manage", label: "管理" }] }],
  },
  {
    code: "audit",
    label: "审计日志",
    resources: [{ code: "audit", label: "审计", actions: [{ code: "view", label: "查看" }] }],
  },
  {
    code: "report",
    label: "报表",
    resources: [{ code: "report", label: "报表", actions: [{ code: "view", label: "查看" }, { code: "export", label: "导出" }] }],
  },
  {
    code: "settings",
    label: "系统设置",
    resources: [{ code: "settings", label: "设置", actions: [{ code: "view", label: "查看" }, { code: "edit", label: "编辑" }] }],
  },
  {
    code: "dev",
    label: "开发运维",
    resources: [{ code: "health", label: "健康检查", actions: [{ code: "view", label: "查看" }] }],
  },
];

function archiveSectionLabel(section: string): string {
  const map: Record<string, string> = {
    personal: "个人信息",
    work: "工作信息",
    service: "员工服务",
    background: "背景信息",
    development: "人才发展",
  };
  return map[section] ?? section;
}

/** 根据模块/资源/操作生成标准权限 code */
export function buildPermissionCode(
  moduleCode: string,
  resourceCode: string,
  actionCode: string,
): string {
  if (resourceCode.startsWith("archive:")) {
    const section = resourceCode.replace("archive:", "");
    return `employee:archive:${section}:${actionCode}`;
  }
  if (resourceCode === moduleCode) {
    return `${moduleCode}:${actionCode}`;
  }
  return `${moduleCode}:${resourceCode}:${actionCode}`;
}

/** 根据 code 反推向导字段（用于编辑展示） */
export function parsePermissionCode(code: string): {
  moduleCode: string;
  resourceCode: string;
  actionCode: string;
} | null {
  const parts = code.split(":");
  if (parts.length === 2) {
    return { moduleCode: parts[0], resourceCode: parts[0], actionCode: parts[1] };
  }
  if (parts.length === 3) {
    return { moduleCode: parts[0], resourceCode: parts[1], actionCode: parts[2] };
  }
  if (parts.length === 4 && parts[0] === "employee" && parts[1] === "archive") {
    return {
      moduleCode: "employee",
      resourceCode: `archive:${parts[2]}`,
      actionCode: parts[3],
    };
  }
  return null;
}

export function buildPermissionName(
  moduleCode: string,
  resourceCode: string,
  actionCode: string,
  modules = PERMISSION_CATALOG,
): string {
  const mod = modules.find((m) => m.code === moduleCode);
  const res = mod?.resources.find((r) => r.code === resourceCode);
  const act = res?.actions.find((a) => a.code === actionCode);
  if (res && act) return `${res.label}-${act.label}`;
  return buildPermissionCode(moduleCode, resourceCode, actionCode);
}

export function findCatalogModule(code: string): CatalogModule | undefined {
  return PERMISSION_CATALOG.find((m) => m.code === code);
}

export function findCatalogResource(
  moduleCode: string,
  resourceCode: string,
): CatalogResource | undefined {
  return findCatalogModule(moduleCode)?.resources.find((r) => r.code === resourceCode);
}
