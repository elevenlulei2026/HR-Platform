package com.hrplatform.platform.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.NoHandlerFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiResponse<Void>> handleBadRequest(IllegalArgumentException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiResponse.fail("BAD_REQUEST", ex.getMessage() == null ? "参数错误" : ex.getMessage()));
  }

  @ExceptionHandler(NoHandlerFoundException.class)
  public ResponseEntity<ApiResponse<Void>> handleNotFound(NoHandlerFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ApiResponse.fail("NOT_FOUND", "接口不存在"));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    String msg = ex.getBindingResult().getAllErrors().stream()
        .findFirst()
        .map(e -> e.getDefaultMessage() == null ? "参数校验失败" : e.getDefaultMessage())
        .orElse("参数校验失败");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail("BAD_REQUEST", msg));
  }

  @ExceptionHandler(HandlerMethodValidationException.class)
  public ResponseEntity<ApiResponse<Void>> handleMethodValidation(HandlerMethodValidationException ex) {
    String msg = ex.getAllValidationResults().stream()
        .flatMap(r -> r.getResolvableErrors().stream())
        .findFirst()
        .map(e -> e.getDefaultMessage() == null ? "参数校验失败" : e.getDefaultMessage())
        .orElse("参数校验失败");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail("BAD_REQUEST", msg));
  }

  @ExceptionHandler(com.hrplatform.platform.auth.UnauthorizedException.class)
  public ResponseEntity<ApiResponse<Void>> handleUnauthorized(com.hrplatform.platform.auth.UnauthorizedException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiResponse.fail("UNAUTHORIZED", ex.getMessage()));
  }

  @ExceptionHandler(com.hrplatform.platform.audit.ForbiddenException.class)
  public ResponseEntity<ApiResponse<Void>> handleForbidden(com.hrplatform.platform.audit.ForbiddenException ex) {
    // #region agent log
    com.hrplatform.platform.debug.DebugLog.logAbs(
        "pre-fix",
        "S3",
        "server/GlobalExceptionHandler",
        "ForbiddenException",
        java.util.Map.of("message", ex.getMessage())
    );
    // #endregion agent log
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiResponse.fail("FORBIDDEN", ex.getMessage()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiResponse<Void>> handleUnreadable(HttpMessageNotReadableException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiResponse.fail("BAD_REQUEST", "请求参数格式错误，请检查数字、日期等字段"));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<ApiResponse<Void>> handleMaxUpload(MaxUploadSizeExceededException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiResponse.fail("BAD_REQUEST", "文件过大，单文件不能超过 20MB"));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex) {
    String msg = "数据关联校验失败，请检查关联字段是否正确";
    String detail = ex.getMessage() == null ? "" : ex.getMessage();
    if (detail.contains("fk_ea_organization_id") || detail.contains("organization_id")) {
      msg = "所选部门无效或已失效，请重新选择部门";
    } else if (detail.contains("fk_ea_position_id") || detail.contains("position_id")) {
      msg = "所选岗位无效或已失效，请重新选择岗位";
    } else if (detail.contains("fk_ea_job_id") || detail.contains("job_id")) {
      msg = "职务关联无效，请重新选择岗位或联系管理员";
    } else if (detail.contains("fk_ea_payroll_company_id") || detail.contains("payroll_company_id")) {
      msg = "发薪公司关联无效，请重新选择发薪公司";
    } else if (detail.contains("fk_ecca_legal_entity_id") || detail.contains("fk_ea_legal_entity_id") || detail.contains("legal_entity_id")) {
      msg = "法人实体关联无效，请重新选择法人实体";
    } else if (detail.contains("storage_key") || detail.contains("employee_attachment")) {
      msg = "附件信息保存失败，请缩短文件名后重试";
    }
    log.warn("Data integrity violation: {}", detail);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail("BAD_REQUEST", msg));
  }

  @ExceptionHandler(ErrorResponseException.class)
  public ResponseEntity<ApiResponse<Void>> handleErrorResponseException(ErrorResponseException ex) {
    HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
    if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
    String msg = ex.getBody() != null && ex.getBody().getDetail() != null
        ? ex.getBody().getDetail()
        : status.getReasonPhrase();
    String code = status.value() == 404 ? "NOT_FOUND" : "REQUEST_ERROR";
    return ResponseEntity.status(status).body(ApiResponse.fail(code, msg));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
    log.error("未处理异常", ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.fail("INTERNAL_ERROR", "服务器内部错误"));
  }
}

