package com.hrplatform.platform.workflow;

/**
 * 业务模块实现此接口并注册为 Spring Bean，在流程完成/驳回时推进业务状态机。
 */
public interface WorkflowCompletionHandler {
  String businessType();

  void onCompleted(WorkflowInstanceEntity instance);

  void onRejected(WorkflowInstanceEntity instance);
}
