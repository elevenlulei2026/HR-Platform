package com.hrplatform.platform.web.audit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrplatform.platform.audit.AuditLogEntity;
import com.hrplatform.platform.audit.AuditLogService;
import com.hrplatform.platform.rbac.RequirePermission;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class AuditLogController {
  private final AuditLogService auditLogService;
  private final ObjectMapper objectMapper;

  public AuditLogController(
      AuditLogService auditLogService,
      ObjectMapper objectMapper
  ) {
    this.auditLogService = auditLogService;
    this.objectMapper = objectMapper;
  }

  @GetMapping("/audit-logs")
  @RequirePermission("audit:view")
  public ApiResponse<Map<String, Object>> list(
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String resourceType,
      @RequestParam(required = false) String operatorUsername,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
      @RequestParam @Min(value = 1, message = "page 必须 >= 1") long page,
      @RequestParam @Min(value = 1, message = "pageSize 必须 >= 1") @Max(value = 200, message = "pageSize 不能超过 200") long pageSize
  ) {
    AuditLogService.PageResult p = auditLogService.page(
        new AuditLogService.Query(action, resourceType, operatorUsername, from, to, page, pageSize)
    );

    List<Map<String, Object>> items = p.records().stream().map(this::toDto).toList();
    Map<String, Object> pageResult = new HashMap<>();
    pageResult.put("items", items);
    pageResult.put("total", p.total());
    pageResult.put("page", page);
    pageResult.put("pageSize", pageSize);
    return ApiResponse.ok(pageResult);
  }

  private Map<String, Object> toDto(AuditLogEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("action", e.getAction());
    dto.put("resourceType", e.getResourceType());
    dto.put("resourceId", e.getResourceId());
    dto.put("operatorUserId", e.getOperatorUserId() == null ? null : String.valueOf(e.getOperatorUserId()));
    dto.put("operatorUsername", e.getOperatorUsername());
    dto.put("ipAddress", e.getIpAddress());
    dto.put("traceId", e.getTraceId());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("detailJson", parseDetailJson(e.getDetailJson()));
    return dto;
  }

  private Map<String, Object> parseDetailJson(String json) {
    if (json == null || json.isBlank()) return Map.of();
    try {
      return objectMapper.readValue(json, new TypeReference<>() {});
    } catch (Exception ex) {
      return Map.of("raw", json);
    }
  }
}

