package com.hrplatform.platform.workflow;

import java.util.Set;

/**
 * 审批人解析策略。platform 内置 ROLE / INITIATOR_SELECT；
 * 依赖组织/任职主数据的规则由 core 模块实现，避免 platform → core 依赖。
 */
public interface WorkflowAssigneeStrategy {
  Set<String> supportedTypes();

  long resolve(
      WorkflowDefinitionModel.WorkflowNodeModel node,
      WorkflowAssigneeResolveContext context
  );
}
