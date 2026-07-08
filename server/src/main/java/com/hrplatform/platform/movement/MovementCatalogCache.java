package com.hrplatform.platform.movement;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class MovementCatalogCache {
  private final AtomicReference<List<MovementCatalogSnapshot>> snapshot = new AtomicReference<>();

  public List<MovementCatalogSnapshot> get() {
    return snapshot.get();
  }

  public void set(List<MovementCatalogSnapshot> value) {
    snapshot.set(value);
  }

  public void invalidate() {
    snapshot.set(null);
  }

  public record MovementCatalogSnapshot(
      MovementTypeEntity type,
      List<ReasonSnapshot> reasons
  ) {}

  public record ReasonSnapshot(
      MovementReasonEntity reason,
      List<MovementReasonSubEntity> subs
  ) {}
}
