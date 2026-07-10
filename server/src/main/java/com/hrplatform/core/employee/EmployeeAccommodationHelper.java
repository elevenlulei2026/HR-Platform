package com.hrplatform.core.employee;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EmployeeAccommodationHelper {
  public record VersionSpliceResult(List<EmployeeAccommodationEntity> toUpdate) {}

  public VersionSpliceResult resolveVersionSplice(
      EmployeeAccommodationEntity newRow,
      List<EmployeeAccommodationEntity> allForEmployee,
      LocalDate newStart
  ) {
    if (newStart == null) {
      throw new IllegalArgumentException("生效日期不能为空");
    }
    boolean duplicateStart = allForEmployee.stream()
        .filter(a -> a.getId() == null || !a.getId().equals(newRow.getId()))
        .anyMatch(v -> newStart.equals(v.getEffectiveStartDate()));
    if (duplicateStart) {
      throw new IllegalArgumentException("该生效日期已存在住宿信息版本记录");
    }

    EmployeeAccommodationEntity containing = allForEmployee.stream()
        .filter(v -> v.getEffectiveStartDate() != null
            && !v.getEffectiveStartDate().isAfter(newStart)
            && (v.getEffectiveEndDate() == null || !v.getEffectiveEndDate().isBefore(newStart)))
        .max(Comparator.comparing(EmployeeAccommodationEntity::getEffectiveStartDate))
        .orElse(null);

    EmployeeAccommodationEntity nextAfter = allForEmployee.stream()
        .filter(v -> v.getEffectiveStartDate() != null && v.getEffectiveStartDate().isAfter(newStart))
        .min(Comparator.comparing(EmployeeAccommodationEntity::getEffectiveStartDate))
        .orElse(null);

    LocalDate newEnd = nextAfter == null ? null : nextAfter.getEffectiveStartDate().minusDays(1);

    List<EmployeeAccommodationEntity> toUpdate = new ArrayList<>();
    if (containing != null && !newStart.equals(containing.getEffectiveStartDate())) {
      containing.setEffectiveEndDate(newStart.minusDays(1));
      toUpdate.add(containing);
    }

    newRow.setEffectiveStartDate(newStart);
    newRow.setEffectiveEndDate(newEnd);
    return new VersionSpliceResult(toUpdate);
  }

  public EmployeeAccommodationEntity cloneRow(EmployeeAccommodationEntity src) {
    EmployeeAccommodationEntity copy = new EmployeeAccommodationEntity();
    copy.setEmployeeId(src.getEmployeeId());
    copy.setStatus(src.getStatus());
    copy.setHasAccommodation(src.getHasAccommodation());
    copy.setAccommodationFeeTotal(src.getAccommodationFeeTotal());
    return copy;
  }

  public void applyPatch(EmployeeAccommodationEntity cur, EmployeeAccommodationEntity patch) {
    if (patch.getStatus() != null) {
      cur.setStatus(patch.getStatus().trim());
    }
    if (patch.getHasAccommodation() != null) {
      cur.setHasAccommodation(patch.getHasAccommodation().trim());
    }
    if (patch.getAccommodationFeeTotal() != null) {
      cur.setAccommodationFeeTotal(patch.getAccommodationFeeTotal());
    }
  }

  public void normalizeDefaults(EmployeeAccommodationEntity entity) {
    if (entity.getStatus() == null || entity.getStatus().isBlank()) {
      entity.setStatus("ACTIVE");
    } else {
      entity.setStatus(entity.getStatus().trim());
    }
    if (entity.getHasAccommodation() == null || entity.getHasAccommodation().isBlank()) {
      entity.setHasAccommodation("NO");
    } else {
      entity.setHasAccommodation(entity.getHasAccommodation().trim());
    }
  }
}
