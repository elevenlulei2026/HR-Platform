package com.hrplatform.platform.employeegroup;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class EmployeeGroupCatalogCache {
  private final AtomicReference<List<GroupCatalogSnapshot>> snapshot = new AtomicReference<>();

  public List<GroupCatalogSnapshot> get() {
    return snapshot.get();
  }

  public void set(List<GroupCatalogSnapshot> value) {
    snapshot.set(value);
  }

  public void invalidate() {
    snapshot.set(null);
  }

  public record GroupCatalogSnapshot(
      EmployeeGroupEntity group,
      List<EmployeeSubgroupEntity> subgroups
  ) {}
}
