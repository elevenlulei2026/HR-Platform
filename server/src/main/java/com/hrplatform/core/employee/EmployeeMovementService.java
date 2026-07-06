package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.dict.DictItemEntity;
import com.hrplatform.platform.dict.DictService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class EmployeeMovementService {
  private static final Map<String, String> MOVEMENT_TYPE_NAMES = Map.ofEntries(
      Map.entry("HIR", "雇佣"),
      Map.entry("REH", "重新雇佣"),
      Map.entry("PRC", "转正"),
      Map.entry("SPR", "雇佣类型变更"),
      Map.entry("PRO", "晋升晋级"),
      Map.entry("DEM", "降职降级"),
      Map.entry("DTA", "数据更改"),
      Map.entry("XFR", "调动"),
      Map.entry("PAY", "调薪"),
      Map.entry("TER", "离职")
  );

  private final EmployeeMovementMapper movementMapper;
  private final DictService dictService;

  public EmployeeMovementService(EmployeeMovementMapper movementMapper, DictService dictService) {
    this.movementMapper = movementMapper;
    this.dictService = dictService;
  }

  public List<EmployeeMovementEntity> listByEmployee(long employeeId) {
    return movementMapper.selectList(
        new LambdaQueryWrapper<EmployeeMovementEntity>()
            .eq(EmployeeMovementEntity::getEmployeeId, employeeId)
            .orderByDesc(EmployeeMovementEntity::getEffectiveDate)
            .orderByDesc(EmployeeMovementEntity::getId)
    );
  }

  @Transactional
  public void recordHire(long employeeId, Long assignmentId, LocalDate effectiveDate) {
    insert("HIR", "H01", effectiveDate, employeeId, null, assignmentId, "manual_create");
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
    DictItemEntity reason = dictService.listItemsByTypeCode("MOVEMENT_REASON").stream()
        .filter(i -> reasonCode.equals(i.getValue()))
        .findFirst()
        .orElse(null);

    EmployeeMovementEntity entity = new EmployeeMovementEntity();
    entity.setEmployeeId(employeeId);
    entity.setMovementType(movementType);
    entity.setMovementTypeName(MOVEMENT_TYPE_NAMES.getOrDefault(movementType, movementType));
    entity.setReasonCode(reasonCode);
    entity.setReasonDescription(reason == null ? reasonCode : reason.getLabel());
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
