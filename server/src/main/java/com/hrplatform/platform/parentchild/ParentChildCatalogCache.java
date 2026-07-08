package com.hrplatform.platform.parentchild;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class ParentChildCatalogCache {
  private final ConcurrentHashMap<String, AtomicReference<List<CatalogSnapshot>>> snapshotsByType = new ConcurrentHashMap<>();

  public List<CatalogSnapshot> get(String typeCode) {
    AtomicReference<List<CatalogSnapshot>> ref = snapshotsByType.get(typeCode);
    return ref == null ? null : ref.get();
  }

  public void set(String typeCode, List<CatalogSnapshot> value) {
    snapshotsByType.computeIfAbsent(typeCode, k -> new AtomicReference<>()).set(value);
  }

  public void invalidate(String typeCode) {
    AtomicReference<List<CatalogSnapshot>> ref = snapshotsByType.get(typeCode);
    if (ref != null) ref.set(null);
  }

  public void invalidateAll() {
    for (Map.Entry<String, AtomicReference<List<CatalogSnapshot>>> e : snapshotsByType.entrySet()) {
      e.getValue().set(null);
    }
  }

  public record CatalogSnapshot(
      ParentChildItemEntity parent,
      List<ParentChildItemEntity> children
  ) {}
}

