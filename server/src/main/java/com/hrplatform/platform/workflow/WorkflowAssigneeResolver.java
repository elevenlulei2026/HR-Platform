package com.hrplatform.platform.workflow;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WorkflowAssigneeResolver {
  private final Map<String, WorkflowAssigneeStrategy> strategyByType = new HashMap<>();

  public WorkflowAssigneeResolver(List<WorkflowAssigneeStrategy> strategies) {
    for (WorkflowAssigneeStrategy strategy : strategies) {
      for (String type : strategy.supportedTypes()) {
        strategyByType.put(type, strategy);
      }
    }
  }

  public long resolve(
      WorkflowDefinitionModel.WorkflowNodeModel node,
      WorkflowAssigneeResolveContext context
  ) {
    WorkflowDefinitionModel.WorkflowAssigneeRuleModel rule = node.getAssigneeRule();
    if (rule == null || rule.getType() == null || rule.getType().isBlank()) {
      throw new IllegalArgumentException("节点缺少审批人规则");
    }
    WorkflowAssigneeStrategy strategy = strategyByType.get(rule.getType());
    if (strategy == null) {
      throw new IllegalArgumentException("不支持的审批人规则: " + rule.getType());
    }
    return strategy.resolve(node, context);
  }

  /** 兼容旧调用：无组织覆盖 */
  public long resolve(
      WorkflowDefinitionModel.WorkflowNodeModel node,
      long initiatorUserId,
      Map<String, Long> nodeAssignees
  ) {
    return resolve(node, new WorkflowAssigneeResolveContext(initiatorUserId, nodeAssignees, null));
  }
}
