package com.hrplatform.modules.jobmovement;

import com.hrplatform.platform.workflow.WorkflowCompletionHandler;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
public class DemotionWorkflowCompletionHandler implements WorkflowCompletionHandler {
  private static final Logger log = LoggerFactory.getLogger(DemotionWorkflowCompletionHandler.class);
  private final JobMovementService jobMovementService;

  public DemotionWorkflowCompletionHandler(@Lazy JobMovementService jobMovementService) {
    this.jobMovementService = jobMovementService;
  }

  @Override
  public String businessType() {
    return "DEMOTION";
  }

  @Override
  public void onCompleted(WorkflowInstanceEntity instance) {
    long id = parseId(instance.getBusinessId());
    log.info("Demotion workflow completed: requestId={}, instanceId={}", id, instance.getId());
    jobMovementService.onWorkflowCompleted(id);
  }

  @Override
  public void onRejected(WorkflowInstanceEntity instance) {
    long id = parseId(instance.getBusinessId());
    log.info("Demotion workflow rejected: requestId={}, instanceId={}", id, instance.getId());
    jobMovementService.onWorkflowRejected(id);
  }

  private static long parseId(String businessId) {
    if (businessId == null || businessId.isBlank()) {
      throw new IllegalArgumentException("降职流程 businessId 为空");
    }
    try {
      return Long.parseLong(businessId.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("无效的降职单 ID: " + businessId);
    }
  }
}
