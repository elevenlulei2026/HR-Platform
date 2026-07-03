package com.hrplatform.platform.web;

public record ApiResponse<T>(
    String code,
    String message,
    T data,
    String traceId
) {
  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>("OK", "success", data, TraceId.current());
  }

  public static <T> ApiResponse<T> fail(String code, String message) {
    return new ApiResponse<>(code, message, null, TraceId.current());
  }
}

