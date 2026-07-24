package com.hrplatform.modules.jobmovement;

import com.hrplatform.platform.workflow.WorkflowCompletionHandler;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
public class EmploymentTypeChangeWorkflowCompletionHandler implements WorkflowCompletionHandler {
  private static final Logger log = LoggerFactory.getLogger(EmploymentTypeChangeWorkflowCompletionHandler.class);
  private final JobMovementService jobMovementService;

  public EmploymentTypeChangeWorkflowCompletionHandler(@Lazy JobMovementService jobMovementService) {
    this.jobMovementService = jobMovementService;
  }

  @Override
  public String businessType() {
    return "EMPLOYMENT_TYPE_CHANGE";
  }

  @Override
  public void onCompleted(WorkflowInstanceEntity instance) {
    long id = parseId(instance.getBusinessId());
    log.info("Employment type change workflow completed: requestId={}, instanceId={}", id, instance.getId());
    jobMovementService.onWorkflowCompleted(id);
  }

  @Override
  public void onRejected(WorkflowInstanceEntity instance) {
    long id = parseId(instance.getBusinessId());
    log.info("Employment type change workflow rejected: requestId={}, instanceId={}", id, instance.getId());
    jobMovementService.onWorkflowRejected(id);
  }

  private static long parseId(String businessId) {
    if (businessId == null || businessId.isBlank()) {
      throw new IllegalArgumentException("雇佣类型变更流程 businessId 为空");
    }
    try {
      return Long.parseLong(businessId.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("无效的雇佣类型变更单 ID: " + businessId);
    }
  }
}
