package com.hrplatform.platform.web;

import org.slf4j.MDC;

import java.util.Optional;

public final class TraceId {
  public static final String MDC_KEY = "traceId";

  private TraceId() {}

  public static String current() {
    return Optional.ofNullable(MDC.get(MDC_KEY)).orElse("unknown");
  }
}

