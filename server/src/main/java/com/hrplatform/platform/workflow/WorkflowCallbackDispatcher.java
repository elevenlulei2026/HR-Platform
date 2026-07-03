package com.hrplatform.platform.workflow;

import com.hrplatform.platform.audit.AuditLogEntity;
import com.hrplatform.platform.audit.AuditLogService;
import com.hrplatform.platform.auth.Jsons;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class WorkflowCallbackDispatcher {
  private final List<WorkflowCompletionHandler> handlers;
  private final AuditLogService auditLogService;

  public WorkflowCallbackDispatcher(List<WorkflowCompletionHandler> handlers, AuditLogService auditLogService) {
    this.handlers = handlers;
    this.auditLogService = auditLogService;
  }

  public void dispatchCompleted(WorkflowInstanceEntity instance) {
    invokeHandlers(instance, true);
    appendAudit(instance, "COMPLETED");
  }

  public void dispatchRejected(WorkflowInstanceEntity instance) {
    invokeHandlers(instance, false);
    appendAudit(instance, "REJECTED");
  }

  private void invokeHandlers(WorkflowInstanceEntity instance, boolean completed) {
    if (handlers == null || handlers.isEmpty()) return;
    for (WorkflowCompletionHandler handler : handlers) {
      if (!instance.getBusinessType().equals(handler.businessType())) continue;
      if (completed) {
        handler.onCompleted(instance);
      } else {
        handler.onRejected(instance);
      }
    }
  }

  private void appendAudit(WorkflowInstanceEntity instance, String outcome) {
    AuditLogEntity log = new AuditLogEntity();
    log.setAction("UPDATE");
    log.setResourceType("WORKFLOW_INSTANCE");
    log.setResourceId(instance.getId() == null ? null : String.valueOf(instance.getId()));
    log.setDetailJson(Jsons.write(Map.of(
        "event", "WORKFLOW_CALLBACK",
        "outcome", outcome,
        "businessType", instance.getBusinessType(),
        "businessId", instance.getBusinessId(),
        "definitionCode", instance.getDefinitionCode(),
        "status", instance.getStatus()
    )));
    auditLogService.append(log);
  }
}
