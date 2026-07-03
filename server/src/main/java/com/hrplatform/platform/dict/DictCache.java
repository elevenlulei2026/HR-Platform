package com.hrplatform.platform.dict;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DictCache {
  private final Map<String, List<DictItemEntity>> byTypeCode = new ConcurrentHashMap<>();

  public List<DictItemEntity> getItems(String typeCode) {
    return byTypeCode.get(typeCode);
  }

  public void putItems(String typeCode, List<DictItemEntity> items) {
    byTypeCode.put(typeCode, items);
  }

  public void invalidateType(String typeCode) {
    if (typeCode == null || typeCode.isBlank()) return;
    byTypeCode.remove(typeCode);
  }

  public void invalidateAll() {
    byTypeCode.clear();
  }
}

