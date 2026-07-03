package com.hrplatform.platform.web.workflow;

import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import com.hrplatform.platform.workflow.WorkflowDefinitionEntity;
import com.hrplatform.platform.workflow.WorkflowDefinitionService;
import com.hrplatform.platform.workflow.WorkflowEngine;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import com.hrplatform.platform.workflow.WorkflowTaskEntity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class WorkflowController {
  private final WorkflowDefinitionService definitionService;
  private final WorkflowEngine workflowEngine;
  private final RbacService rbacService;

  public WorkflowController(
      WorkflowDefinitionService definitionService,
      WorkflowEngine workflowEngine,
      RbacService rbacService
  ) {
    this.definitionService = definitionService;
    this.workflowEngine = workflowEngine;
    this.rbacService = rbacService;
  }

  // ---------------------------
  // Workflow definitions
  // ---------------------------

  @GetMapping("/workflow-definitions")
  public ApiResponse<Map<String, Object>> listDefinitions(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    return ApiResponse.ok(definitionService.page(keyword, status, page, pageSize));
  }

  @PostMapping("/workflow-definitions")
  public ApiResponse<Map<String, Object>> createDefinition(@Valid @RequestBody WorkflowDefinitionCreateRequest req) {
    WorkflowDefinitionEntity e = definitionService.create(req.code(), req.name(), req.description(), req.definitionJson());
    return ApiResponse.ok(definitionService.toDto(e));
  }

  @GetMapping("/workflow-definitions/{id}")
  public ApiResponse<Map<String, Object>> getDefinition(@PathVariable("id") long id) {
    return ApiResponse.ok(definitionService.toDto(definitionService.get(id)));
  }

  @PutMapping("/workflow-definitions/{id}")
  public ApiResponse<Map<String, Object>> updateDefinition(
      @PathVariable("id") long id,
      @Valid @RequestBody WorkflowDefinitionUpdateRequest req
  ) {
    WorkflowDefinitionEntity e = definitionService.update(id, req.name(), req.description(), req.definitionJson());
    return ApiResponse.ok(definitionService.toDto(e));
  }

  @PostMapping("/workflow-definitions/{id}/publish")
  public ApiResponse<Map<String, Object>> publishDefinition(@PathVariable("id") long id) {
    WorkflowDefinitionEntity e = definitionService.publish(id);
    return ApiResponse.ok(definitionService.toDto(e));
  }

  @DeleteMapping("/workflow-definitions/{id}")
  public ApiResponse<Map<String, Object>> deleteDefinition(@PathVariable("id") long id) {
    definitionService.delete(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  @GetMapping("/workflow/assignee-options")
  public ApiResponse<List<Map<String, Object>>> listAssigneeOptions() {
    return ApiResponse.ok(definitionService.listAssigneeOptions());
  }

  // ---------------------------
  // Workflow instances
  // ---------------------------

  @PostMapping("/workflow-instances")
  public ApiResponse<Map<String, Object>> startInstance(@Valid @RequestBody StartWorkflowInstanceRequest req) {
    rbacService.requirePermission("workflow:manage");
    Map<String, Long> nodeAssignees = new HashMap<>();
    if (req.nodeAssignees() != null) {
      req.nodeAssignees().forEach((k, v) -> {
        if (v != null && !v.isBlank()) {
          nodeAssignees.put(k, Long.parseLong(v));
        }
      });
    }
    Long initiatorUserId = null;
    if (req.initiatorUserId() != null && !req.initiatorUserId().isBlank()) {
      initiatorUserId = Long.parseLong(req.initiatorUserId());
    }
    WorkflowInstanceEntity instance = workflowEngine.start(new WorkflowEngine.StartCommand(
        req.definitionCode(),
        req.businessType(),
        req.businessId(),
        initiatorUserId,
        nodeAssignees
    ));
    return ApiResponse.ok(workflowEngine.toInstanceDto(instance));
  }

  @GetMapping("/workflow-instances/{id}")
  public ApiResponse<Map<String, Object>> getInstance(@PathVariable("id") long id) {
    WorkflowInstanceEntity instance = workflowEngine.getInstance(id);
    return ApiResponse.ok(workflowEngine.toInstanceDto(instance));
  }

  @GetMapping("/workflow-instances/{id}/tasks")
  public ApiResponse<List<Map<String, Object>>> listInstanceTasks(@PathVariable("id") long id) {
    List<WorkflowTaskEntity> tasks = workflowEngine.listInstanceTasks(id);
    return ApiResponse.ok(tasks.stream().map(workflowEngine::toTaskDto).toList());
  }

  // ---------------------------
  // Tasks
  // ---------------------------

  @GetMapping("/tasks/todo")
  public ApiResponse<Map<String, Object>> listTodo(
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    return ApiResponse.ok(workflowEngine.pageTodo(page, pageSize));
  }

  @GetMapping("/tasks/done")
  public ApiResponse<Map<String, Object>> listDone(
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    return ApiResponse.ok(workflowEngine.pageDone(page, pageSize));
  }

  @PostMapping("/tasks/{id}/approve")
  public ApiResponse<Map<String, Object>> approveTask(
      @PathVariable("id") long id,
      @RequestBody(required = false) WorkflowTaskActionRequest req
  ) {
    String comment = req == null ? null : req.comment();
    WorkflowTaskEntity task = workflowEngine.approve(id, comment);
    return ApiResponse.ok(workflowEngine.toTaskDto(task));
  }

  @PostMapping("/tasks/{id}/reject")
  public ApiResponse<Map<String, Object>> rejectTask(
      @PathVariable("id") long id,
      @RequestBody(required = false) WorkflowTaskActionRequest req
  ) {
    String comment = req == null ? null : req.comment();
    WorkflowTaskEntity task = workflowEngine.reject(id, comment);
    return ApiResponse.ok(workflowEngine.toTaskDto(task));
  }

  public record WorkflowDefinitionCreateRequest(
      @NotBlank String code,
      @NotBlank String name,
      String description,
      Map<String, Object> definitionJson
  ) {}

  public record WorkflowDefinitionUpdateRequest(
      String name,
      String description,
      Map<String, Object> definitionJson
  ) {}

  public record StartWorkflowInstanceRequest(
      @NotBlank String definitionCode,
      @NotBlank String businessType,
      @NotBlank String businessId,
      String initiatorUserId,
      Map<String, String> nodeAssignees
  ) {}

  public record WorkflowTaskActionRequest(String comment) {}
}
