package com.hrplatform.platform.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
@Order(10)
public class TraceIdFilter extends OncePerRequestFilter {
  private static final String HEADER_TRACE_ID = "X-Trace-Id";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String traceId = Optional.ofNullable(request.getHeader(HEADER_TRACE_ID))
        .filter(v -> !v.isBlank())
        .orElseGet(() -> UUID.randomUUID().toString().replace("-", ""));

    MDC.put(TraceId.MDC_KEY, traceId);
    try {
      filterChain.doFilter(request, response);
    } finally {
      MDC.remove(TraceId.MDC_KEY);
    }
  }
}

