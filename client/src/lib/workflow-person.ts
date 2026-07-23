/** 流程人员展示：中文名（工号）；无工号时仅姓名/账号 */
export function formatWorkflowPerson(opts: {
  displayName?: string | null;
  employeeNo?: string | null;
  username?: string | null;
  fallbackId?: string | null;
}): string {
  const name = opts.displayName?.trim() || opts.username?.trim();
  const no = opts.employeeNo?.trim();
  if (name && no) return `${name}（${no}）`;
  if (name) return name;
  if (no) return no;
  const id = opts.fallbackId?.trim();
  return id || "—";
}

export function formatWorkflowAssignee(task: {
  assigneeDisplayName?: string | null;
  assigneeEmployeeNo?: string | null;
  assigneeUsername?: string | null;
  assigneeUserId?: string | null;
}): string {
  return formatWorkflowPerson({
    displayName: task.assigneeDisplayName,
    employeeNo: task.assigneeEmployeeNo,
    username: task.assigneeUsername,
    fallbackId: task.assigneeUserId,
  });
}

export function formatWorkflowInitiator(task: {
  initiatorDisplayName?: string | null;
  initiatorEmployeeNo?: string | null;
  initiatorUsername?: string | null;
}): string {
  return formatWorkflowPerson({
    displayName: task.initiatorDisplayName,
    employeeNo: task.initiatorEmployeeNo,
    username: task.initiatorUsername,
  });
}
