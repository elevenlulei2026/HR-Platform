import type {
  PageResult,
  StartWorkflowInstanceRequest,
  WorkflowAssigneeOption,
  WorkflowAssigneePreviewRequest,
  WorkflowAssigneePreviewResult,
  WorkflowAssigneeRuleType,
  WorkflowDefinition,
  WorkflowDefinitionCreateRequest,
  WorkflowDefinitionJson,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionUpdateRequest,
  WorkflowInstance,
  WorkflowTask,
  WorkflowTaskActionRequest,
  WorkflowTaskListQuery,
} from "@shared/api.interface";

import { deleteJson, getJson, postJson, putJson } from "@/api/http";

export async function listWorkflowDefinitions(query: WorkflowDefinitionListQuery) {
  const q = new URLSearchParams();
  q.set("page", String(query.page));
  q.set("pageSize", String(query.pageSize));
  if (query.keyword) q.set("keyword", query.keyword);
  if (query.status) q.set("status", query.status);
  return getJson<PageResult<WorkflowDefinition>>(`/api/v1/workflow-definitions?${q.toString()}`);
}

export async function createWorkflowDefinition(req: WorkflowDefinitionCreateRequest) {
  return postJson<WorkflowDefinition, WorkflowDefinitionCreateRequest>("/api/v1/workflow-definitions", req);
}

export async function updateWorkflowDefinition(id: string, req: WorkflowDefinitionUpdateRequest) {
  return putJson<WorkflowDefinition, WorkflowDefinitionUpdateRequest>(
    `/api/v1/workflow-definitions/${id}`,
    req,
  );
}

export async function getWorkflowDefinition(id: string) {
  return getJson<WorkflowDefinition>(`/api/v1/workflow-definitions/${id}`);
}

export async function publishWorkflowDefinition(id: string) {
  return postJson<WorkflowDefinition, Record<string, never>>(
    `/api/v1/workflow-definitions/${id}/publish`,
    {},
  );
}

export async function disableWorkflowDefinition(id: string) {
  return postJson<WorkflowDefinition, Record<string, never>>(
    `/api/v1/workflow-definitions/${id}/disable`,
    {},
  );
}

export async function enableWorkflowDefinition(id: string) {
  return postJson<WorkflowDefinition, Record<string, never>>(
    `/api/v1/workflow-definitions/${id}/enable`,
    {},
  );
}

export async function reviseWorkflowDefinition(id: string) {
  return postJson<WorkflowDefinition, Record<string, never>>(
    `/api/v1/workflow-definitions/${id}/revise`,
    {},
  );
}

export async function previewWorkflowAssignees(id: string, req: WorkflowAssigneePreviewRequest) {
  return postJson<WorkflowAssigneePreviewResult, WorkflowAssigneePreviewRequest>(
    `/api/v1/workflow-definitions/${id}/preview-assignees`,
    req,
  );
}

export async function deleteWorkflowDefinition(id: string) {
  return deleteJson<{ id: string }>(`/api/v1/workflow-definitions/${id}`);
}

export async function listAssigneeOptions() {
  return getJson<WorkflowAssigneeOption[]>("/api/v1/workflow/assignee-options");
}

export async function startWorkflowInstance(req: StartWorkflowInstanceRequest) {
  return postJson<WorkflowInstance, StartWorkflowInstanceRequest>("/api/v1/workflow-instances", req);
}

export async function getWorkflowInstance(id: string) {
  return getJson<WorkflowInstance>(`/api/v1/workflow-instances/${id}`);
}

export async function listWorkflowInstanceTasks(id: string) {
  return getJson<WorkflowTask[]>(`/api/v1/workflow-instances/${id}/tasks`);
}

export async function listTodoTasks(query: WorkflowTaskListQuery) {
  const q = new URLSearchParams();
  q.set("page", String(query.page));
  q.set("pageSize", String(query.pageSize));
  if (query.keyword) q.set("keyword", query.keyword);
  if (query.businessType) q.set("businessType", query.businessType);
  return getJson<PageResult<WorkflowTask>>(`/api/v1/tasks/todo?${q.toString()}`);
}

export async function listDoneTasks(query: WorkflowTaskListQuery) {
  const q = new URLSearchParams();
  q.set("page", String(query.page));
  q.set("pageSize", String(query.pageSize));
  if (query.keyword) q.set("keyword", query.keyword);
  if (query.businessType) q.set("businessType", query.businessType);
  return getJson<PageResult<WorkflowTask>>(`/api/v1/tasks/done?${q.toString()}`);
}

export async function approveTask(id: string, req: WorkflowTaskActionRequest = {}) {
  return postJson<WorkflowTask, WorkflowTaskActionRequest>(`/api/v1/tasks/${id}/approve`, req);
}

export async function rejectTask(id: string, req: WorkflowTaskActionRequest = {}) {
  return postJson<WorkflowTask, WorkflowTaskActionRequest>(`/api/v1/tasks/${id}/reject`, req);
}

export const ASSIGNEE_RULE_OPTIONS: Array<{
  type: WorkflowAssigneeRuleType;
  label: string;
  hint: string;
}> = [
  { type: "DIRECT_MANAGER", label: "汇报线直属上级", hint: "优先手工 DIRECT，其次组织衍生；可按目标组织解析" },
  { type: "REPORTING_LINE", label: "汇报线上第 N 级", hint: "完整汇报链中本人之后的第 N 位" },
  { type: "ORG_LEADER", label: "组织负责人", hint: "按组织树上溯找部门负责人" },
  { type: "ORG_HRBP", label: "HRBP", hint: "任职字段优先，否则组织 HRBP" },
  { type: "ORG_SSC", label: "SSC", hint: "任职字段优先，否则组织 SSC" },
  { type: "ORG_HR_COORDINATOR", label: "人资协调员", hint: "任职字段优先，否则组织人资协调员" },
  { type: "ROLE", label: "指定系统角色", hint: "按角色取一名可用审批人" },
  { type: "INITIATOR_SELECT", label: "发起时指定", hint: "发起流程时由操作人选择审批人" },
];

export function assigneeRuleLabel(type: WorkflowAssigneeRuleType): string {
  return ASSIGNEE_RULE_OPTIONS.find((o) => o.type === type)?.label ?? type;
}

export function validateWorkflowDefinitionJson(json: WorkflowDefinitionJson): string | null {
  if (!json.nodes || json.nodes.length === 0) {
    return "至少需要一个审批节点";
  }
  const keys = new Set<string>();
  for (let i = 0; i < json.nodes.length; i++) {
    const node = json.nodes[i];
    if (!node.key?.trim()) return `第 ${i + 1} 个节点缺少标识`;
    if (keys.has(node.key.trim())) return `节点标识重复：${node.key}`;
    keys.add(node.key.trim());
    if (!node.name?.trim()) return `第 ${i + 1} 个节点缺少名称`;
    if (!node.assigneeRule?.type) return `节点 ${node.key} 缺少审批人规则`;
    if (node.assigneeRule.type === "ROLE" && !node.assigneeRule.roleCode?.trim()) {
      return `节点 ${node.key} 的角色规则缺少角色编码`;
    }
    if (node.assigneeRule.type === "REPORTING_LINE") {
      const level = node.assigneeRule.level;
      if (!level || level < 1) return `节点 ${node.key} 的汇报线级别须 ≥ 1`;
    }
  }
  return null;
}

export const DEFAULT_ONBOARDING_DEFINITION: WorkflowDefinitionJson = {
  nodes: [
    { key: "org_leader", name: "组织负责人审批", assigneeRule: { type: "ORG_LEADER" } },
    { key: "hrbp_approve", name: "HRBP 审批", assigneeRule: { type: "ORG_HRBP" } },
    { key: "hr_approve", name: "HR 审批", assigneeRule: { type: "ROLE", roleCode: "hr" } },
  ],
};
