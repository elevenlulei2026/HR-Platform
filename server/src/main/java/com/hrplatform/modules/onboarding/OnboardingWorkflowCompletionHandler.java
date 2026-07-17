package com.hrplatform.modules.onboarding;

import com.hrplatform.platform.workflow.WorkflowCompletionHandler;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
public class OnboardingWorkflowCompletionHandler implements WorkflowCompletionHandler {
  private static final Logger log = LoggerFactory.getLogger(OnboardingWorkflowCompletionHandler.class);

  private final OnboardingService onboardingService;

  public OnboardingWorkflowCompletionHandler(@Lazy OnboardingService onboardingService) {
    this.onboardingService = onboardingService;
  }

  @Override
  public String businessType() {
    return "ONBOARDING";
  }

  @Override
  public void onCompleted(WorkflowInstanceEntity instance) {
    long caseId = parseCaseId(instance.getBusinessId());
    log.info("Onboarding workflow completed: caseId={}, instanceId={}", caseId, instance.getId());
    onboardingService.onWorkflowCompleted(caseId);
  }

  @Override
  public void onRejected(WorkflowInstanceEntity instance) {
    long caseId = parseCaseId(instance.getBusinessId());
    log.info("Onboarding workflow rejected: caseId={}, instanceId={}", caseId, instance.getId());
    onboardingService.onWorkflowRejected(caseId);
  }

  private static long parseCaseId(String businessId) {
    if (businessId == null || businessId.isBlank()) {
      throw new IllegalArgumentException("入职流程 businessId 为空");
    }
    try {
      return Long.parseLong(businessId.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("无效的入职单 ID: " + businessId);
    }
  }
}
