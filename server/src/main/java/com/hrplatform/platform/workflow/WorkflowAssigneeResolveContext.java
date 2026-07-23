package com.hrplatform.platform.workflow;

import java.util.Collections;
import java.util.Map;

/**
 * 审批人解析上下文。
 * organizationId 可选：ORG_* 规则优先使用；DIRECT_MANAGER / REPORTING_LINE
 * 在发起人无员工汇报上级时，也可按该组织衍生默认直属上级（如入职办理）。
 */
public class WorkflowAssigneeResolveContext {
  private final long initiatorUserId;
  private final Map<String, Long> nodeAssignees;
  private final Long organizationId;

  public WorkflowAssigneeResolveContext(
      long initiatorUserId,
      Map<String, Long> nodeAssignees,
      Long organizationId
  ) {
    this.initiatorUserId = initiatorUserId;
    this.nodeAssignees = nodeAssignees == null ? Map.of() : Collections.unmodifiableMap(nodeAssignees);
    this.organizationId = organizationId;
  }

  public long getInitiatorUserId() {
    return initiatorUserId;
  }

  public Map<String, Long> getNodeAssignees() {
    return nodeAssignees;
  }

  public Long getOrganizationId() {
    return organizationId;
  }
}
