package com.hrplatform.platform.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthUser;
import com.hrplatform.platform.web.TraceId;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Aspect
@Component
public class AuditAspect {
  private final AuditLogService auditLogService;
  private final ObjectMapper objectMapper;

  public AuditAspect(AuditLogService auditLogService, ObjectMapper objectMapper) {
    this.auditLogService = auditLogService;
    this.objectMapper = objectMapper;
  }

  @Around("within(@org.springframework.web.bind.annotation.RestController *)")
  public Object aroundController(ProceedingJoinPoint pjp) throws Throwable {
    HttpServletRequest request = currentRequest();
    if (request == null) return pjp.proceed();

    String method = request.getMethod();
    if ("GET".equalsIgnoreCase(method)) return pjp.proceed();

    String path = request.getRequestURI();
    String action = toAction(method);

    boolean success = false;
    Object result;
    try {
      result = pjp.proceed();
      success = true;
      return result;
    } finally {
      // 仅记录写操作；失败也记录，但不包含敏感入参
      AuditLogEntity entity = new AuditLogEntity();
      entity.setAction(action);
      entity.setResourceType(resourceTypeFromPath(path));
      entity.setResourceId(resourceIdFromPath(path));

      AuthUser user = AuthContext.current();
      if (user != null) {
        entity.setOperatorUserId(user.id());
        entity.setOperatorUsername(user.username());
      }

      entity.setIpAddress(clientIp(request));
      entity.setTraceId(TraceId.current());
      entity.setCreatedAt(LocalDateTime.now());

      Map<String, Object> detail = new HashMap<>();
      detail.put("path", path);
      detail.put("method", method);
      detail.put("success", success);
      detail.put("handler", pjp.getSignature().toShortString());
      detail.put("query", request.getQueryString());

      entity.setDetailJson(objectMapper.writeValueAsString(detail));
      auditLogService.append(entity);
    }
  }

  private HttpServletRequest currentRequest() {
    RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
    if (!(attrs instanceof ServletRequestAttributes sra)) return null;
    return sra.getRequest();
  }

  private String toAction(String httpMethod) {
    if (httpMethod == null) return "UPDATE";
    return switch (httpMethod.toUpperCase()) {
      case "POST" -> "CREATE";
      case "PUT", "PATCH" -> "UPDATE";
      case "DELETE" -> "DELETE";
      default -> "UPDATE";
    };
  }

  private String resourceTypeFromPath(String path) {
    if (path == null) return "unknown";
    String p = path.startsWith("/") ? path.substring(1) : path;
    String[] seg = p.split("/");
    if (seg.length < 3) return "unknown";
    // /api/v1/{resourceType}/...
    return seg[2];
  }

  private String resourceIdFromPath(String path) {
    if (path == null) return null;
    String[] seg = path.split("/");
    if (seg.length == 0) return null;
    String last = seg[seg.length - 1];
    if (last == null || last.isBlank()) return null;
    if (last.matches("\\d+")) return last;
    return null;
  }

  private String clientIp(HttpServletRequest request) {
    String xff = request.getHeader("X-Forwarded-For");
    if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
    return request.getRemoteAddr();
  }
}

