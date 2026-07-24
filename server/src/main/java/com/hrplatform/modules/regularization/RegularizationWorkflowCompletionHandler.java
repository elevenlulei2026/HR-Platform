package com.hrplatform.modules.regularization;

import com.hrplatform.platform.workflow.WorkflowCompletionHandler;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
public class RegularizationWorkflowCompletionHandler implements WorkflowCompletionHandler {
  private static final Logger log = LoggerFactory.getLogger(RegularizationWorkflowCompletionHandler.class);

  private final RegularizationService regularizationService;

  public RegularizationWorkflowCompletionHandler(@Lazy RegularizationService regularizationService) {
    this.regularizationService = regularizationService;
  }

  @Override
  public String businessType() {
    return "REGULARIZATION";
  }

  @Override
  public void onCompleted(WorkflowInstanceEntity instance) {
    long requestId = parseRequestId(instance.getBusinessId());
    log.info("Regularization workflow completed: requestId={}, instanceId={}", requestId, instance.getId());
    regularizationService.onWorkflowCompleted(requestId);
  }

  @Override
  public void onRejected(WorkflowInstanceEntity instance) {
    long requestId = parseRequestId(instance.getBusinessId());
    log.info("Regularization workflow rejected: requestId={}, instanceId={}", requestId, instance.getId());
    regularizationService.onWorkflowRejected(requestId);
  }

  private static long parseRequestId(String businessId) {
    if (businessId == null || businessId.isBlank()) {
      throw new IllegalArgumentException("转正流程 businessId 为空");
    }
    try {
      return Long.parseLong(businessId.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("无效的转正单 ID: " + businessId);
    }
  }
}
