package com.hrplatform.core.employee;

import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.parentchild.ParentChildCatalogService;
import com.hrplatform.platform.parentchild.ParentChildItemEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class EmployeeMovementService {
  private final EmployeeMovementMapper movementMapper;
  private final ParentChildCatalogService catalogService;
  private static final String TYPE_CODE = "MOVEMENT_CATALOG";

  public EmployeeMovementService(
      EmployeeMovementMapper movementMapper,
      ParentChildCatalogService catalogService
  ) {
    this.movementMapper = movementMapper;
    this.catalogService = catalogService;
  }

  public List<EmployeeMovementEntity> listByEmployee(long employeeId) {
    return movementMapper.selectList(
        new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<EmployeeMovementEntity>()
            .eq(EmployeeMovementEntity::getEmployeeId, employeeId)
            .orderByDesc(EmployeeMovementEntity::getEffectiveDate)
            .orderByDesc(EmployeeMovementEntity::getId)
    );
  }

  @Transactional
  public void recordHire(long employeeId, Long assignmentId, LocalDate effectiveDate) {
    insert("HIR", "H01", null, effectiveDate, employeeId, null, assignmentId, "manual_create");
  }

  @Transactional
  public void insert(
      String movementType,
      String reasonCode,
      LocalDate effectiveDate,
      long employeeId,
      Long fromAssignmentId,
      Long toAssignmentId,
      String sourceType
  ) {
    insert(movementType, reasonCode, null, effectiveDate, employeeId, fromAssignmentId, toAssignmentId, sourceType);
  }

  @Transactional
  public void insert(
      String movementType,
      String reasonCode,
      String reasonSubCode,
      LocalDate effectiveDate,
      long employeeId,
      Long fromAssignmentId,
      Long toAssignmentId,
      String sourceType
  ) {
    ParentChildItemEntity type = catalogService.requireItemByCode(TYPE_CODE, movementType);
    ParentChildItemEntity reason = catalogService.listChildren(TYPE_CODE, movementType).stream()
        .filter(r -> reasonCode != null && reasonCode.equals(r.getCode()))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("无效的操作原因: " + reasonCode));
    ParentChildItemEntity sub = null;
    List<ParentChildItemEntity> activeSubs = catalogService.listChildren(TYPE_CODE, reason.getCode()).stream()
        .filter(s -> "ACTIVE".equals(s.getStatus()))
        .toList();
    if (!activeSubs.isEmpty()) {
      String sc = reasonSubCode == null ? "" : reasonSubCode.trim();
      if (sc.isBlank()) {
        throw new IllegalArgumentException("操作原因 " + reasonCode + " 必须选择原因子项");
      }
      sub = activeSubs.stream()
          .filter(s -> sc.equals(s.getCode()))
          .findFirst()
          .orElseThrow(() -> new IllegalArgumentException("无效的原因子项: " + sc));
    } else if (reasonSubCode != null && !reasonSubCode.isBlank()) {
      throw new IllegalArgumentException("操作原因 " + reasonCode + " 不需要原因子项");
    }

    EmployeeMovementEntity entity = new EmployeeMovementEntity();
    entity.setEmployeeId(employeeId);
    entity.setMovementType(type.getCode());
    entity.setMovementTypeName(type.getName());
    entity.setReasonCode(reason.getCode());
    entity.setReasonDescription(reason.getName());
    if (sub != null) {
      entity.setReasonSubCode(sub.getCode());
      entity.setReasonSubDescription(sub.getName());
    }
    entity.setEffectiveDate(effectiveDate);
    entity.setFromAssignmentId(fromAssignmentId);
    entity.setToAssignmentId(toAssignmentId);
    entity.setSourceRequestType(sourceType);
    entity.setCreatedAt(LocalDateTime.now());
    var user = AuthContext.current();
    if (user != null) entity.setCreatedBy(user.id());
    movementMapper.insert(entity);
  }
}
