import type {
  PageResult,
  StartWorkflowInstanceRequest,
  WorkflowAssigneeOption,
  WorkflowDefinition,
  WorkflowDefinitionCreateRequest,
  WorkflowDefinitionJson,
  WorkflowDefinitionListQuery,
  WorkflowDefinitionUpdateRequest,
  WorkflowInstance,
  WorkflowTask,
  WorkflowTaskActionRequest,
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

export async function listTodoTasks(query: { page: number; pageSize: number }) {
  const q = new URLSearchParams();
  q.set("page", String(query.page));
  q.set("pageSize", String(query.pageSize));
  return getJson<PageResult<WorkflowTask>>(`/api/v1/tasks/todo?${q.toString()}`);
}

export async function listDoneTasks(query: { page: number; pageSize: number }) {
  const q = new URLSearchParams();
  q.set("page", String(query.page));
  q.set("pageSize", String(query.pageSize));
  return getJson<PageResult<WorkflowTask>>(`/api/v1/tasks/done?${q.toString()}`);
}

export async function approveTask(id: string, req: WorkflowTaskActionRequest = {}) {
  return postJson<WorkflowTask, WorkflowTaskActionRequest>(`/api/v1/tasks/${id}/approve`, req);
}

export async function rejectTask(id: string, req: WorkflowTaskActionRequest = {}) {
  return postJson<WorkflowTask, WorkflowTaskActionRequest>(`/api/v1/tasks/${id}/reject`, req);
}

export function validateWorkflowDefinitionJson(json: WorkflowDefinitionJson): string | null {
  if (!json.nodes || json.nodes.length === 0) {
    return "至少需要一个审批节点";
  }
  for (let i = 0; i < json.nodes.length; i++) {
    const node = json.nodes[i];
    if (!node.key?.trim()) return `第 ${i + 1} 个节点缺少 key`;
    if (!node.name?.trim()) return `第 ${i + 1} 个节点缺少 name`;
    if (!node.assigneeRule?.type) return `节点 ${node.key} 缺少审批人规则`;
    if (node.assigneeRule.type === "ROLE" && !node.assigneeRule.roleCode?.trim()) {
      return `节点 ${node.key} 的 ROLE 规则缺少 roleCode`;
    }
  }
  return null;
}

export const DEFAULT_ONBOARDING_DEFINITION: WorkflowDefinitionJson = {
  nodes: [
    { key: "manager_approve", name: "直属上级审批", assigneeRule: { type: "DIRECT_MANAGER" } },
    { key: "hr_approve", name: "HR 审批", assigneeRule: { type: "ROLE", roleCode: "hr" } },
    { key: "final_approve", name: "指定审批人", assigneeRule: { type: "INITIATOR_SELECT" } },
  ],
};
