package com.hrplatform.modules.contractchange;

import com.hrplatform.platform.workflow.WorkflowCompletionHandler;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Component
public class ContractChangeWorkflowCompletionHandler implements WorkflowCompletionHandler {
  private static final Logger log = LoggerFactory.getLogger(ContractChangeWorkflowCompletionHandler.class);

  private final ContractChangeService contractChangeService;

  public ContractChangeWorkflowCompletionHandler(@Lazy ContractChangeService contractChangeService) {
    this.contractChangeService = contractChangeService;
  }

  @Override
  public String businessType() {
    return "CONTRACT_CHANGE";
  }

  @Override
  public void onCompleted(WorkflowInstanceEntity instance) {
    long requestId = parseRequestId(instance.getBusinessId());
    log.info("Contract change workflow completed: requestId={}, instanceId={}", requestId, instance.getId());
    contractChangeService.onWorkflowCompleted(requestId);
  }

  @Override
  public void onRejected(WorkflowInstanceEntity instance) {
    long requestId = parseRequestId(instance.getBusinessId());
    log.info("Contract change workflow rejected: requestId={}, instanceId={}", requestId, instance.getId());
    contractChangeService.onWorkflowRejected(requestId);
  }

  private static long parseRequestId(String businessId) {
    if (businessId == null || businessId.isBlank()) {
      throw new IllegalArgumentException("合同变更流程 businessId 为空");
    }
    try {
      return Long.parseLong(businessId.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("无效的合同变更单 ID: " + businessId);
    }
  }
}
