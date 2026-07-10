package com.hrplatform.core.employee;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EmployeeAdminInfoHelper {
  public record VersionSpliceResult(List<EmployeeAdminInfoEntity> toUpdate) {}

  public VersionSpliceResult resolveVersionSplice(
      EmployeeAdminInfoEntity newRow,
      List<EmployeeAdminInfoEntity> allForEmployee,
      LocalDate newStart
  ) {
    if (newStart == null) {
      throw new IllegalArgumentException("生效日期不能为空");
    }
    boolean duplicateStart = allForEmployee.stream()
        .filter(a -> a.getId() == null || !a.getId().equals(newRow.getId()))
        .anyMatch(v -> newStart.equals(v.getEffectiveStartDate()));
    if (duplicateStart) {
      throw new IllegalArgumentException("该生效日期已存在行政信息版本记录");
    }

    EmployeeAdminInfoEntity containing = allForEmployee.stream()
        .filter(v -> v.getEffectiveStartDate() != null
            && !v.getEffectiveStartDate().isAfter(newStart)
            && (v.getEffectiveEndDate() == null || !v.getEffectiveEndDate().isBefore(newStart)))
        .max(Comparator.comparing(EmployeeAdminInfoEntity::getEffectiveStartDate))
        .orElse(null);

    EmployeeAdminInfoEntity nextAfter = allForEmployee.stream()
        .filter(v -> v.getEffectiveStartDate() != null && v.getEffectiveStartDate().isAfter(newStart))
        .min(Comparator.comparing(EmployeeAdminInfoEntity::getEffectiveStartDate))
        .orElse(null);

    LocalDate newEnd = nextAfter == null ? null : nextAfter.getEffectiveStartDate().minusDays(1);

    List<EmployeeAdminInfoEntity> toUpdate = new ArrayList<>();
    if (containing != null && !newStart.equals(containing.getEffectiveStartDate())) {
      containing.setEffectiveEndDate(newStart.minusDays(1));
      toUpdate.add(containing);
    }

    newRow.setEffectiveStartDate(newStart);
    newRow.setEffectiveEndDate(newEnd);
    return new VersionSpliceResult(toUpdate);
  }

  public EmployeeAdminInfoEntity cloneRow(EmployeeAdminInfoEntity src) {
    EmployeeAdminInfoEntity copy = new EmployeeAdminInfoEntity();
    copy.setEmployeeId(src.getEmployeeId());
    copy.setStatus(src.getStatus());
    copy.setWorkEnvironment(src.getWorkEnvironment());
    copy.setTakeShuttle(src.getTakeShuttle());
    copy.setParkingPermit(src.getParkingPermit());
    return copy;
  }

  public void applyPatch(EmployeeAdminInfoEntity cur, EmployeeAdminInfoEntity patch) {
    if (patch.getStatus() != null) {
      cur.setStatus(patch.getStatus().trim());
    }
    if (patch.getWorkEnvironment() != null) {
      cur.setWorkEnvironment(patch.getWorkEnvironment().trim());
    }
    if (patch.getTakeShuttle() != null) {
      cur.setTakeShuttle(patch.getTakeShuttle().trim());
    }
    if (patch.getParkingPermit() != null) {
      cur.setParkingPermit(patch.getParkingPermit().trim());
    }
  }

  public void normalizeDefaults(EmployeeAdminInfoEntity entity) {
    if (entity.getStatus() == null || entity.getStatus().isBlank()) {
      entity.setStatus("ACTIVE");
    } else {
      entity.setStatus(entity.getStatus().trim());
    }
    if (entity.getWorkEnvironment() != null) {
      entity.setWorkEnvironment(entity.getWorkEnvironment().trim());
    }
    if (entity.getTakeShuttle() == null || entity.getTakeShuttle().isBlank()) {
      entity.setTakeShuttle("NO");
    } else {
      entity.setTakeShuttle(entity.getTakeShuttle().trim());
    }
    if (entity.getParkingPermit() == null || entity.getParkingPermit().isBlank()) {
      entity.setParkingPermit("NO");
    } else {
      entity.setParkingPermit(entity.getParkingPermit().trim());
    }
  }
}
