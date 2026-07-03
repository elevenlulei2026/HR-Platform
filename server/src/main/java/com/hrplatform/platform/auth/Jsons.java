package com.hrplatform.platform.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;

public final class Jsons {
  private static final ObjectMapper MAPPER = new ObjectMapper();

  private Jsons() {}

  public static String write(Object obj) {
    try {
      return MAPPER.writeValueAsString(obj);
    } catch (JsonProcessingException e) {
      return "{\"code\":\"INTERNAL_ERROR\",\"message\":\"JSON 序列化失败\",\"data\":null,\"traceId\":\"\"}";
    }
  }

  public static Map<String, Object> readMap(String json) {
    if (json == null || json.isBlank()) return Map.of();
    try {
      return MAPPER.readValue(json, new TypeReference<>() {});
    } catch (Exception ex) {
      return Map.of("raw", json);
    }
  }
}

