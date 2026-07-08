package com.hrplatform.core.employee;

import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.movement.MovementCatalogService;
import com.hrplatform.platform.movement.MovementReasonEntity;
import com.hrplatform.platform.movement.MovementReasonSubEntity;
import com.hrplatform.platform.movement.MovementTypeEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class EmployeeMovementService {
  private final EmployeeMovementMapper movementMapper;
  private final MovementCatalogService catalogService;

  public EmployeeMovementService(
      EmployeeMovementMapper movementMapper,
      MovementCatalogService catalogService
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
    MovementCatalogService.ResolvedMovement resolved =
        catalogService.resolve(movementType, reasonCode, reasonSubCode, true);

    MovementTypeEntity type = resolved.type();
    MovementReasonEntity reason = resolved.reason();
    MovementReasonSubEntity sub = resolved.sub();

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
