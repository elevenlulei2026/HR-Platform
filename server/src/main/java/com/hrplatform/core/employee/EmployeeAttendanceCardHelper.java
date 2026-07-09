package com.hrplatform.core.employee;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EmployeeAttendanceCardHelper {
  public record VersionSpliceResult(List<EmployeeAttendanceCardEntity> toUpdate) {}

  public String normalizeCardNo(String cardNo) {
    if (cardNo == null || cardNo.isBlank()) {
      throw new IllegalArgumentException("请填写考勤卡号");
    }
    return cardNo.trim();
  }

  /**
   * 按员工维度衔接版本链（每人仅一张考勤卡，但允许按生效日换新卡）。
   */
  public VersionSpliceResult resolveVersionSplice(
      EmployeeAttendanceCardEntity newRow,
      List<EmployeeAttendanceCardEntity> allForEmployee,
      LocalDate newStart
  ) {
    if (newStart == null) {
      throw new IllegalArgumentException("生效日期不能为空");
    }
    boolean duplicateStart = allForEmployee.stream()
        .filter(a -> a.getId() == null || !a.getId().equals(newRow.getId()))
        .anyMatch(v -> newStart.equals(v.getEffectiveStartDate()));
    if (duplicateStart) {
      throw new IllegalArgumentException("该生效日期已存在考勤卡版本记录");
    }

    EmployeeAttendanceCardEntity containing = allForEmployee.stream()
        .filter(v -> v.getEffectiveStartDate() != null
            && !v.getEffectiveStartDate().isAfter(newStart)
            && (v.getEffectiveEndDate() == null || !v.getEffectiveEndDate().isBefore(newStart)))
        .max(Comparator.comparing(EmployeeAttendanceCardEntity::getEffectiveStartDate))
        .orElse(null);

    EmployeeAttendanceCardEntity nextAfter = allForEmployee.stream()
        .filter(v -> v.getEffectiveStartDate() != null && v.getEffectiveStartDate().isAfter(newStart))
        .min(Comparator.comparing(EmployeeAttendanceCardEntity::getEffectiveStartDate))
        .orElse(null);

    LocalDate newEnd = nextAfter == null ? null : nextAfter.getEffectiveStartDate().minusDays(1);

    List<EmployeeAttendanceCardEntity> toUpdate = new ArrayList<>();
    if (containing != null && !newStart.equals(containing.getEffectiveStartDate())) {
      containing.setEffectiveEndDate(newStart.minusDays(1));
      toUpdate.add(containing);
    }

    newRow.setCardNo(normalizeCardNo(newRow.getCardNo()));
    newRow.setEffectiveStartDate(newStart);
    newRow.setEffectiveEndDate(newEnd);
    return new VersionSpliceResult(toUpdate);
  }

  public EmployeeAttendanceCardEntity cloneCard(EmployeeAttendanceCardEntity src) {
    EmployeeAttendanceCardEntity copy = new EmployeeAttendanceCardEntity();
    copy.setEmployeeId(src.getEmployeeId());
    copy.setCardNo(src.getCardNo());
    copy.setStatus(src.getStatus());
    copy.setParticipateInAttendance(src.getParticipateInAttendance());
    copy.setRemark(src.getRemark());
    return copy;
  }

  public void applyPatch(EmployeeAttendanceCardEntity cur, EmployeeAttendanceCardEntity patch) {
    if (patch.getCardNo() != null) {
      cur.setCardNo(normalizeCardNo(patch.getCardNo()));
    }
    if (patch.getStatus() != null) {
      cur.setStatus(patch.getStatus().trim());
    }
    if (patch.getParticipateInAttendance() != null) {
      cur.setParticipateInAttendance(patch.getParticipateInAttendance().trim());
    }
    if (patch.getRemark() != null) {
      cur.setRemark(patch.getRemark().trim());
    }
  }

  public void normalizeDefaults(EmployeeAttendanceCardEntity entity) {
    entity.setCardNo(normalizeCardNo(entity.getCardNo()));
    if (entity.getStatus() == null || entity.getStatus().isBlank()) {
      entity.setStatus("ACTIVE");
    } else {
      entity.setStatus(entity.getStatus().trim());
    }
    if (entity.getParticipateInAttendance() == null || entity.getParticipateInAttendance().isBlank()) {
      entity.setParticipateInAttendance("YES");
    } else {
      entity.setParticipateInAttendance(entity.getParticipateInAttendance().trim());
    }
    if (entity.getRemark() != null) {
      entity.setRemark(entity.getRemark().trim());
    }
  }
}
