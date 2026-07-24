package com.hrplatform.modules.offboarding;

import com.hrplatform.platform.workflow.WorkflowCompletionHandler;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
public class OffboardingWorkflowCompletionHandler implements WorkflowCompletionHandler {
  private static final Logger log = LoggerFactory.getLogger(OffboardingWorkflowCompletionHandler.class);

  private final OffboardingService offboardingService;

  public OffboardingWorkflowCompletionHandler(@Lazy OffboardingService offboardingService) {
    this.offboardingService = offboardingService;
  }

  @Override
  public String businessType() {
    return "OFFBOARDING";
  }

  @Override
  public void onCompleted(WorkflowInstanceEntity instance) {
    long caseId = parseCaseId(instance.getBusinessId());
    log.info("Offboarding workflow completed: caseId={}, instanceId={}", caseId, instance.getId());
    offboardingService.onWorkflowCompleted(caseId);
  }

  @Override
  public void onRejected(WorkflowInstanceEntity instance) {
    long caseId = parseCaseId(instance.getBusinessId());
    log.info("Offboarding workflow rejected: caseId={}, instanceId={}", caseId, instance.getId());
    offboardingService.onWorkflowRejected(caseId);
  }

  private static long parseCaseId(String businessId) {
    if (businessId == null || businessId.isBlank()) {
      throw new IllegalArgumentException("离职流程 businessId 为空");
    }
    try {
      return Long.parseLong(businessId.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("无效的离职单 ID: " + businessId);
    }
  }
}
