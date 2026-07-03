package com.hrplatform.platform.workflow;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 演示用回调：入职等业务模块未实现前，通过日志验证回调链路。
 */
@Component
public class DemoWorkflowCompletionHandler implements WorkflowCompletionHandler {
  private static final Logger log = LoggerFactory.getLogger(DemoWorkflowCompletionHandler.class);

  @Override
  public String businessType() {
    return "ONBOARDING";
  }

  @Override
  public void onCompleted(WorkflowInstanceEntity instance) {
    log.info(
        "Workflow completed callback: businessType={}, businessId={}, instanceId={}",
        instance.getBusinessType(),
        instance.getBusinessId(),
        instance.getId()
    );
  }

  @Override
  public void onRejected(WorkflowInstanceEntity instance) {
    log.info(
        "Workflow rejected callback: businessType={}, businessId={}, instanceId={}",
        instance.getBusinessType(),
        instance.getBusinessId(),
        instance.getId()
    );
  }
}
