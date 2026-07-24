package com.hrplatform.modules.contractchange;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hrplatform.core.employee.EmployeeAgreementEntity;
import com.hrplatform.core.employee.EmployeeAgreementMapper;
import com.hrplatform.core.employee.EmployeeArchiveService;
import com.hrplatform.core.employee.EmployeeAssignmentEntity;
import com.hrplatform.core.employee.EmployeeContractEntity;
import com.hrplatform.core.employee.EmployeeContractMapper;
import com.hrplatform.core.employee.EmployeeEntity;
import com.hrplatform.core.employee.EmployeeMapper;
import com.hrplatform.core.employee.EmployeeService;
import com.hrplatform.core.organization.LegalEntityEntity;
import com.hrplatform.core.organization.LegalEntityMapper;
import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthUser;
import com.hrplatform.platform.code.CodeGeneratorService;
import com.hrplatform.platform.workflow.WorkflowEngine;
import com.hrplatform.platform.workflow.WorkflowInstanceEntity;
import com.hrplatform.platform.workflow.WorkflowInstanceMapper;
import com.hrplatform.platform.workflow.WorkflowTaskEntity;
import com.hrplatform.platform.workflow.WorkflowTaskMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ContractChangeService {
  private static final int DEFAULT_EXPIRY_DAYS = 30;

  private final ContractChangeRequestMapper requestMapper;
  private final EmployeeMapper employeeMapper;
  private final EmployeeContractMapper contractMapper;
  private final EmployeeAgreementMapper agreementMapper;
  private final LegalEntityMapper legalEntityMapper;
  private final EmployeeArchiveService archiveService;
  private final EmployeeService employeeService;
  private final CodeGeneratorService codeGeneratorService;
  private final WorkflowEngine workflowEngine;
  private final WorkflowInstanceMapper workflowInstanceMapper;
  private final WorkflowTaskMapper workflowTaskMapper;

  public ContractChangeService(
      ContractChangeRequestMapper requestMapper,
      EmployeeMapper employeeMapper,
      EmployeeContractMapper contractMapper,
      EmployeeAgreementMapper agreementMapper,
      LegalEntityMapper legalEntityMapper,
      EmployeeArchiveService archiveService,
      EmployeeService employeeService,
      CodeGeneratorService codeGeneratorService,
      WorkflowEngine workflowEngine,
      WorkflowInstanceMapper workflowInstanceMapper,
      WorkflowTaskMapper workflowTaskMapper
  ) {
    this.requestMapper = requestMapper;
    this.employeeMapper = employeeMapper;
    this.contractMapper = contractMapper;
    this.agreementMapper = agreementMapper;
    this.legalEntityMapper = legalEntityMapper;
    this.archiveService = archiveService;
    this.employeeService = employeeService;
    this.codeGeneratorService = codeGeneratorService;
    this.workflowEngine = workflowEngine;
    this.workflowInstanceMapper = workflowInstanceMapper;
    this.workflowTaskMapper = workflowTaskMapper;
  }

  public PageResult page(
      String requestType,
      String targetKind,
      String keyword,
      String status,
      long page,
      long pageSize
  ) {
    LambdaQueryWrapper<ContractChangeRequestEntity> qw = new LambdaQueryWrapper<ContractChangeRequestEntity>()
        .orderByDesc(ContractChangeRequestEntity::getId);
    if (requestType != null && !requestType.isBlank()) {
      qw.eq(ContractChangeRequestEntity::getRequestType, ContractChangeTypes.requireRequestType(requestType));
    }
    if (targetKind != null && !targetKind.isBlank()) {
      qw.eq(ContractChangeRequestEntity::getTargetKind, ContractChangeTypes.requireTargetKind(targetKind));
    }
    if (status != null && !status.isBlank()) {
      qw.eq(ContractChangeRequestEntity::getStatus, status.trim().toUpperCase());
    }
    if (keyword != null && !keyword.isBlank()) {
      String k = keyword.trim();
      List<Long> employeeIds = employeeMapper.selectList(
          new LambdaQueryWrapper<EmployeeEntity>()
              .and(w -> w.like(EmployeeEntity::getEmployeeNo, k)
                  .or().like(EmployeeEntity::getFullName, k))
              .select(EmployeeEntity::getId)
      ).stream().map(EmployeeEntity::getId).toList();
      qw.and(w -> {
        w.like(ContractChangeRequestEntity::getRequestNo, k);
        if (!employeeIds.isEmpty()) {
          w.or().in(ContractChangeRequestEntity::getEmployeeId, employeeIds);
        }
      });
    }
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    Long total = requestMapper.selectCount(qw);
    qw.last("LIMIT " + ((p - 1) * ps) + ", " + ps);
    return new PageResult(requestMapper.selectList(qw), total == null ? 0 : total);
  }

  public ContractChangeRequestEntity require(long id) {
    ContractChangeRequestEntity e = requestMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("合同变更单不存在");
    return e;
  }

  @Transactional
  public ContractChangeRequestEntity create(CreateCommand cmd) {
    String requestType = ContractChangeTypes.requireRequestType(cmd.requestType());
    String targetKind = ContractChangeTypes.requireTargetKind(cmd.targetKind());
    if (cmd.employeeId() == null) throw new IllegalArgumentException("员工不能为空");
    if (cmd.sourceRecordId() == null) throw new IllegalArgumentException("源档案不能为空");
    if (cmd.proposedStartDate() == null) throw new IllegalArgumentException("拟开始日期不能为空");

    employeeService.require(cmd.employeeId());
    SourceSnapshot source = requireSource(targetKind, cmd.employeeId(), cmd.sourceRecordId());
    assertNoOpenRequest(targetKind, cmd.sourceRecordId());

    ContractChangeRequestEntity entity = new ContractChangeRequestEntity();
    entity.setRequestNo(codeGeneratorService.generate("CONTRACT_CHANGE_REQUEST_NO", cmd.proposedStartDate()).code());
    entity.setRequestType(requestType);
    entity.setTargetKind(targetKind);
    entity.setEmployeeId(cmd.employeeId());
    entity.setSourceRecordId(cmd.sourceRecordId());
    applyProposedFields(entity, cmd, source, true);
    entity.setStatus(ContractChangeStatus.DRAFT);
    Long userId = currentUserId();
    entity.setCreatedBy(userId);
    entity.setUpdatedBy(userId);
    requestMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public ContractChangeRequestEntity update(long id, UpdateCommand cmd) {
    ContractChangeRequestEntity cur = require(id);
    requireStatus(cur, ContractChangeStatus.DRAFT);
    SourceSnapshot source = requireSource(cur.getTargetKind(), cur.getEmployeeId(), cur.getSourceRecordId());

    if (cmd.proposedStartDate() != null) cur.setProposedStartDate(cmd.proposedStartDate());
    if (cmd.proposedEndDate() != null) cur.setProposedEndDate(cmd.proposedEndDate());
    if (cmd.proposedEffectiveStartDate() != null) {
      cur.setProposedEffectiveStartDate(cmd.proposedEffectiveStartDate());
    }
    if (cmd.legalEntityId() != null) cur.setLegalEntityId(cmd.legalEntityId());
    if (cmd.contractCategory() != null) cur.setContractCategory(blankToNull(cmd.contractCategory()));
    if (cmd.contractCategoryDesc() != null) {
      cur.setContractCategoryDesc(blankToNull(cmd.contractCategoryDesc()));
    }
    if (cmd.contractCode() != null) cur.setContractCode(blankToNull(cmd.contractCode()));
    if (cmd.agreementCategory() != null) cur.setAgreementCategory(blankToNull(cmd.agreementCategory()));
    if (cmd.agreementCode() != null) cur.setAgreementCode(blankToNull(cmd.agreementCode()));
    if (cmd.fileAttachmentId() != null) cur.setFileAttachmentId(cmd.fileAttachmentId());
    if (cmd.opinion() != null) cur.setOpinion(blankToNull(cmd.opinion()));
    if (cmd.remark() != null) cur.setRemark(blankToNull(cmd.remark()));

    if (cur.getProposedStartDate() == null) {
      throw new IllegalArgumentException("拟开始日期不能为空");
    }
    // 变更单默认保留源档案未改字段
    if (ContractChangeTypes.CHANGE.equals(cur.getRequestType())) {
      fillMissingFromSource(cur, source);
    }
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public ContractChangeRequestEntity submit(long id, Map<String, Long> nodeAssignees) {
    ContractChangeRequestEntity cur = require(id);
    requireStatus(cur, ContractChangeStatus.DRAFT);
    requireSource(cur.getTargetKind(), cur.getEmployeeId(), cur.getSourceRecordId());
    if (cur.getProposedStartDate() == null) {
      throw new IllegalArgumentException("拟开始日期不能为空");
    }

    Long orgId = null;
    EmployeeAssignmentEntity primary = employeeService.findCurrentPrimaryAssignment(cur.getEmployeeId());
    if (primary != null) orgId = primary.getOrganizationId();

    Map<String, Long> assignees = nodeAssignees == null ? Map.of() : Map.copyOf(nodeAssignees);
    WorkflowInstanceEntity instance = workflowEngine.start(new WorkflowEngine.StartCommand(
        ContractChangeTypes.definitionCodeOf(cur.getRequestType()),
        ContractChangeTypes.businessTypeOf(cur.getRequestType()),
        String.valueOf(cur.getId()),
        null,
        assignees,
        orgId
    ));

    cur.setWorkflowInstanceId(instance.getId());
    cur.setStatus(ContractChangeStatus.PENDING);
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public ContractChangeRequestEntity cancel(long id) {
    ContractChangeRequestEntity cur = require(id);
    if (ContractChangeStatus.CANCELLED.equals(cur.getStatus())
        || ContractChangeStatus.COMPLETED.equals(cur.getStatus())) {
      throw new IllegalArgumentException("当前状态不可取消: " + cur.getStatus());
    }
    if (ContractChangeStatus.PENDING.equals(cur.getStatus()) && cur.getWorkflowInstanceId() != null) {
      workflowEngine.cancelRunningInstance(cur.getWorkflowInstanceId(), "合同变更单取消");
    }
    cur.setStatus(ContractChangeStatus.CANCELLED);
    cur.setUpdatedBy(currentUserId());
    requestMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public void onWorkflowCompleted(long requestId) {
    ContractChangeRequestEntity cur = require(requestId);
    if (!ContractChangeStatus.PENDING.equals(cur.getStatus())) {
      throw new IllegalStateException("合同变更单状态不是 PENDING，无法完成审批回调: " + cur.getStatus());
    }
    SourceSnapshot source = requireSource(cur.getTargetKind(), cur.getEmployeeId(), cur.getSourceRecordId());

    if (ContractChangeTypes.RENEWAL.equals(cur.getRequestType())) {
      applyRenewal(cur, source);
    } else {
      applyChange(cur, source);
    }

    cur.setStatus(ContractChangeStatus.COMPLETED);
    requestMapper.updateById(cur);
  }

  @Transactional
  public void onWorkflowRejected(long requestId) {
    ContractChangeRequestEntity cur = require(requestId);
    if (!ContractChangeStatus.PENDING.equals(cur.getStatus())) return;
    cur.setStatus(ContractChangeStatus.DRAFT);
    requestMapper.updateById(cur);
  }

  public List<Map<String, Object>> listApprovalTasks(long requestId) {
    ContractChangeRequestEntity cur = require(requestId);
    if (cur.getWorkflowInstanceId() == null) return List.of();
    return workflowEngine.listInstanceTaskDtosInternal(cur.getWorkflowInstanceId());
  }

  public boolean canCurrentUserViewRequest(long requestId) {
    AuthUser current = AuthContext.current();
    if (current == null) return false;
    ContractChangeRequestEntity cur = require(requestId);
    if (cur.getWorkflowInstanceId() == null) return false;
    WorkflowInstanceEntity instance = workflowInstanceMapper.selectById(cur.getWorkflowInstanceId());
    if (instance == null) return false;
    if (current.id().equals(instance.getInitiatorUserId())) return true;
    Long related = workflowTaskMapper.selectCount(
        new LambdaQueryWrapper<WorkflowTaskEntity>()
            .eq(WorkflowTaskEntity::getInstanceId, instance.getId())
            .eq(WorkflowTaskEntity::getAssigneeUserId, current.id())
    );
    return related != null && related > 0;
  }

  /** 扫描即将到期档案，幂等生成 DRAFT 续签单 */
  @Transactional
  public ScanResult scanExpiryReminders() {
    LocalDate today = LocalDate.now();
    LocalDate until = today.plusDays(DEFAULT_EXPIRY_DAYS);
    List<ExpiringItem> items = collectExpiring(today, until, null, null);
    int created = 0;
    for (ExpiringItem item : items) {
      if (item.openRequestId() != null) continue;
      LocalDate newStart = item.endDate().plusDays(1);
      LocalDate newEnd = item.endDate().plusYears(1);
      create(new CreateCommand(
          ContractChangeTypes.RENEWAL,
          item.targetKind(),
          item.employeeId(),
          item.recordId(),
          newStart,
          newEnd,
          newStart,
          item.legalEntityId(),
          item.contractCategory(),
          item.contractCategoryDesc(),
          item.contractCode(),
          item.agreementCategory(),
          item.agreementCode(),
          item.fileAttachmentId(),
          "系统到期提醒自动生成",
          "到期前 " + DEFAULT_EXPIRY_DAYS + " 天自动提醒"
      ));
      created++;
    }
    return new ScanResult(items.size(), created);
  }

  public ExpiringPageResult pageExpiring(
      Integer days,
      String targetKind,
      String keyword,
      long page,
      long pageSize
  ) {
    int d = days == null || days < 1 ? DEFAULT_EXPIRY_DAYS : days;
    LocalDate today = LocalDate.now();
    LocalDate until = today.plusDays(d);
    String kind = targetKind == null || targetKind.isBlank()
        ? null : ContractChangeTypes.requireTargetKind(targetKind);
    List<ExpiringItem> all = collectExpiring(today, until, kind, keyword);
    all.sort(Comparator.comparing(ExpiringItem::endDate).thenComparing(ExpiringItem::recordId));
    long p = Math.max(1, page);
    long ps = Math.max(1, pageSize);
    int from = (int) Math.min((p - 1) * ps, all.size());
    int to = (int) Math.min(from + ps, all.size());
    return new ExpiringPageResult(all.subList(from, to), all.size());
  }

  public Map<Long, EmployeeEntity> employeeMap(List<ContractChangeRequestEntity> items) {
    List<Long> ids = items.stream().map(ContractChangeRequestEntity::getEmployeeId).distinct().toList();
    if (ids.isEmpty()) return Map.of();
    return employeeMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(EmployeeEntity::getId, e -> e, (a, b) -> a));
  }

  public Map<Long, LegalEntityEntity> legalEntityMap(List<ContractChangeRequestEntity> items) {
    List<Long> ids = items.stream()
        .map(ContractChangeRequestEntity::getLegalEntityId)
        .filter(Objects::nonNull)
        .distinct()
        .toList();
    if (ids.isEmpty()) return Map.of();
    return legalEntityMapper.selectBatchIds(ids).stream()
        .collect(Collectors.toMap(LegalEntityEntity::getId, e -> e, (a, b) -> a));
  }

  public Map<String, Object> toDto(
      ContractChangeRequestEntity e,
      EmployeeEntity employee,
      LegalEntityEntity legalEntity,
      SourceSnapshot source
  ) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("requestNo", e.getRequestNo());
    dto.put("requestType", e.getRequestType());
    dto.put("requestTypeLabel", ContractChangeTypes.REQUEST_TYPE_NAMES.getOrDefault(
        e.getRequestType(), e.getRequestType()));
    dto.put("targetKind", e.getTargetKind());
    dto.put("targetKindLabel", ContractChangeTypes.TARGET_KIND_NAMES.getOrDefault(
        e.getTargetKind(), e.getTargetKind()));
    dto.put("employeeId", String.valueOf(e.getEmployeeId()));
    dto.put("employeeNo", employee == null ? null : employee.getEmployeeNo());
    dto.put("employeeName", employee == null ? null : employee.getFullName());
    dto.put("sourceRecordId", String.valueOf(e.getSourceRecordId()));
    if (source != null) {
      dto.put("sourceCode", source.code());
      dto.put("sourceEndDate", source.endDate() == null ? null : source.endDate().toString());
      dto.put("sourceStatus", source.status());
    }
    dto.put("proposedStartDate", e.getProposedStartDate() == null ? null : e.getProposedStartDate().toString());
    dto.put("proposedEndDate", e.getProposedEndDate() == null ? null : e.getProposedEndDate().toString());
    dto.put(
        "proposedEffectiveStartDate",
        e.getProposedEffectiveStartDate() == null ? null : e.getProposedEffectiveStartDate().toString()
    );
    dto.put("legalEntityId", e.getLegalEntityId() == null ? null : String.valueOf(e.getLegalEntityId()));
    dto.put("legalEntityName", legalEntity == null ? null : legalEntity.getName());
    dto.put("contractCategory", e.getContractCategory());
    dto.put("contractCategoryDesc", e.getContractCategoryDesc());
    dto.put("contractCode", e.getContractCode());
    dto.put("agreementCategory", e.getAgreementCategory());
    dto.put("agreementCode", e.getAgreementCode());
    dto.put(
        "fileAttachmentId",
        e.getFileAttachmentId() == null ? null : String.valueOf(e.getFileAttachmentId())
    );
    dto.put("opinion", e.getOpinion());
    dto.put("status", e.getStatus());
    dto.put(
        "workflowInstanceId",
        e.getWorkflowInstanceId() == null ? null : String.valueOf(e.getWorkflowInstanceId())
    );
    dto.put("remark", e.getRemark());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  public Map<String, Object> toExpiringDto(ExpiringItem item, EmployeeEntity employee) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("targetKind", item.targetKind());
    dto.put("targetKindLabel", ContractChangeTypes.TARGET_KIND_NAMES.get(item.targetKind()));
    dto.put("recordId", String.valueOf(item.recordId()));
    dto.put("employeeId", String.valueOf(item.employeeId()));
    dto.put("employeeNo", employee == null ? null : employee.getEmployeeNo());
    dto.put("employeeName", employee == null ? null : employee.getFullName());
    dto.put("code", item.code());
    dto.put("endDate", item.endDate().toString());
    dto.put("daysRemaining", item.daysRemaining());
    dto.put("status", item.status());
    dto.put("openRequestId", item.openRequestId() == null ? null : String.valueOf(item.openRequestId()));
    dto.put("openRequestNo", item.openRequestNo());
    dto.put("openRequestType", item.openRequestType());
    return dto;
  }

  public SourceSnapshot loadSourceSnapshot(ContractChangeRequestEntity e) {
    try {
      return requireSource(e.getTargetKind(), e.getEmployeeId(), e.getSourceRecordId());
    } catch (IllegalArgumentException ignored) {
      return null;
    }
  }

  private void applyRenewal(ContractChangeRequestEntity cur, SourceSnapshot source) {
    LocalDate closeDate = cur.getProposedStartDate().minusDays(1);
    if (ContractChangeTypes.CONTRACT.equals(cur.getTargetKind())) {
      EmployeeContractEntity closePatch = new EmployeeContractEntity();
      closePatch.setEndDate(source.endDate() != null && source.endDate().isBefore(closeDate)
          ? source.endDate() : closeDate);
      closePatch.setEffectiveEndDate(closeDate);
      closePatch.setStatus("INVALID");
      archiveService.updateContract(cur.getEmployeeId(), cur.getSourceRecordId(), closePatch);

      EmployeeContractEntity neu = new EmployeeContractEntity();
      neu.setEffectiveStartDate(
          cur.getProposedEffectiveStartDate() != null
              ? cur.getProposedEffectiveStartDate()
              : cur.getProposedStartDate()
      );
      neu.setContractCode(firstNonBlank(cur.getContractCode(), source.contractCode()));
      neu.setContractCategory(firstNonBlank(cur.getContractCategory(), source.contractCategory()));
      neu.setContractCategoryDesc(firstNonBlank(cur.getContractCategoryDesc(), source.contractCategoryDesc()));
      neu.setLegalEntityId(cur.getLegalEntityId() != null ? cur.getLegalEntityId() : source.legalEntityId());
      neu.setOperationType(ContractChangeTypes.OP_RENEWAL);
      neu.setStartDate(cur.getProposedStartDate());
      neu.setEndDate(cur.getProposedEndDate());
      neu.setStatus("VALID");
      neu.setFileAttachmentId(
          cur.getFileAttachmentId() != null ? cur.getFileAttachmentId() : source.fileAttachmentId()
      );
      neu.setRemark(cur.getRemark());
      archiveService.createContract(cur.getEmployeeId(), neu);
      return;
    }

    EmployeeAgreementEntity closePatch = new EmployeeAgreementEntity();
    closePatch.setEndDate(source.endDate() != null && source.endDate().isBefore(closeDate)
        ? source.endDate() : closeDate);
    closePatch.setEffectiveEndDate(closeDate);
    closePatch.setStatus("INVALID");
    archiveService.updateAgreement(cur.getEmployeeId(), cur.getSourceRecordId(), closePatch);

    EmployeeAgreementEntity neu = new EmployeeAgreementEntity();
    neu.setEffectiveStartDate(
        cur.getProposedEffectiveStartDate() != null
            ? cur.getProposedEffectiveStartDate()
            : cur.getProposedStartDate()
    );
    neu.setAgreementCode(firstNonBlank(cur.getAgreementCode(), source.agreementCode()));
    neu.setAgreementCategory(firstNonBlank(cur.getAgreementCategory(), source.agreementCategory()));
    neu.setLegalEntityId(cur.getLegalEntityId() != null ? cur.getLegalEntityId() : source.legalEntityId());
    neu.setOperationType(ContractChangeTypes.OP_RENEWAL);
    neu.setStartDate(cur.getProposedStartDate());
    neu.setEndDate(cur.getProposedEndDate());
    neu.setStatus("VALID");
    neu.setFileAttachmentId(
        cur.getFileAttachmentId() != null ? cur.getFileAttachmentId() : source.fileAttachmentId()
    );
    neu.setRemark(cur.getRemark());
    archiveService.createAgreement(cur.getEmployeeId(), neu);
  }

  private void applyChange(ContractChangeRequestEntity cur, SourceSnapshot source) {
    if (ContractChangeTypes.CONTRACT.equals(cur.getTargetKind())) {
      EmployeeContractEntity patch = new EmployeeContractEntity();
      patch.setOperationType(ContractChangeTypes.OP_CHANGE);
      if (cur.getProposedStartDate() != null) patch.setStartDate(cur.getProposedStartDate());
      if (cur.getProposedEndDate() != null) patch.setEndDate(cur.getProposedEndDate());
      if (cur.getProposedEffectiveStartDate() != null) {
        patch.setEffectiveStartDate(cur.getProposedEffectiveStartDate());
      }
      if (cur.getLegalEntityId() != null) patch.setLegalEntityId(cur.getLegalEntityId());
      if (cur.getContractCategory() != null) patch.setContractCategory(cur.getContractCategory());
      if (cur.getContractCategoryDesc() != null) {
        patch.setContractCategoryDesc(cur.getContractCategoryDesc());
      }
      if (cur.getContractCode() != null) patch.setContractCode(cur.getContractCode());
      if (cur.getFileAttachmentId() != null) patch.setFileAttachmentId(cur.getFileAttachmentId());
      if (cur.getRemark() != null) patch.setRemark(cur.getRemark());
      archiveService.updateContract(cur.getEmployeeId(), cur.getSourceRecordId(), patch);
      return;
    }

    EmployeeAgreementEntity patch = new EmployeeAgreementEntity();
    patch.setOperationType(ContractChangeTypes.OP_CHANGE);
    if (cur.getProposedStartDate() != null) patch.setStartDate(cur.getProposedStartDate());
    if (cur.getProposedEndDate() != null) patch.setEndDate(cur.getProposedEndDate());
    if (cur.getProposedEffectiveStartDate() != null) {
      patch.setEffectiveStartDate(cur.getProposedEffectiveStartDate());
    }
    if (cur.getLegalEntityId() != null) patch.setLegalEntityId(cur.getLegalEntityId());
    if (cur.getAgreementCategory() != null) patch.setAgreementCategory(cur.getAgreementCategory());
    if (cur.getAgreementCode() != null) patch.setAgreementCode(cur.getAgreementCode());
    if (cur.getFileAttachmentId() != null) patch.setFileAttachmentId(cur.getFileAttachmentId());
    if (cur.getRemark() != null) patch.setRemark(cur.getRemark());
    archiveService.updateAgreement(cur.getEmployeeId(), cur.getSourceRecordId(), patch);
  }

  private List<ExpiringItem> collectExpiring(
      LocalDate today,
      LocalDate until,
      String targetKind,
      String keyword
  ) {
    List<ExpiringItem> result = new ArrayList<>();
    Map<String, ContractChangeRequestEntity> openBySource = loadOpenRequestsBySourceKey();

    if (targetKind == null || ContractChangeTypes.CONTRACT.equals(targetKind)) {
      List<EmployeeContractEntity> contracts = contractMapper.selectList(
          new LambdaQueryWrapper<EmployeeContractEntity>()
              .eq(EmployeeContractEntity::getStatus, "VALID")
              .isNotNull(EmployeeContractEntity::getEndDate)
              .ge(EmployeeContractEntity::getEndDate, today)
              .le(EmployeeContractEntity::getEndDate, until)
      );
      for (EmployeeContractEntity c : contracts) {
        if (!matchKeyword(c.getEmployeeId(), c.getContractCode(), keyword)) continue;
        String key = ContractChangeTypes.CONTRACT + ":" + c.getId();
        ContractChangeRequestEntity open = openBySource.get(key);
        result.add(new ExpiringItem(
            ContractChangeTypes.CONTRACT,
            c.getId(),
            c.getEmployeeId(),
            c.getContractCode(),
            c.getEndDate(),
            (int) ChronoUnit.DAYS.between(today, c.getEndDate()),
            c.getStatus(),
            c.getLegalEntityId(),
            c.getContractCategory(),
            c.getContractCategoryDesc(),
            c.getContractCode(),
            null,
            null,
            c.getFileAttachmentId(),
            open == null ? null : open.getId(),
            open == null ? null : open.getRequestNo(),
            open == null ? null : open.getRequestType()
        ));
      }
    }

    if (targetKind == null || ContractChangeTypes.AGREEMENT.equals(targetKind)) {
      List<EmployeeAgreementEntity> agreements = agreementMapper.selectList(
          new LambdaQueryWrapper<EmployeeAgreementEntity>()
              .eq(EmployeeAgreementEntity::getStatus, "VALID")
              .isNotNull(EmployeeAgreementEntity::getEndDate)
              .ge(EmployeeAgreementEntity::getEndDate, today)
              .le(EmployeeAgreementEntity::getEndDate, until)
      );
      for (EmployeeAgreementEntity a : agreements) {
        if (!matchKeyword(a.getEmployeeId(), a.getAgreementCode(), keyword)) continue;
        String key = ContractChangeTypes.AGREEMENT + ":" + a.getId();
        ContractChangeRequestEntity open = openBySource.get(key);
        result.add(new ExpiringItem(
            ContractChangeTypes.AGREEMENT,
            a.getId(),
            a.getEmployeeId(),
            a.getAgreementCode(),
            a.getEndDate(),
            (int) ChronoUnit.DAYS.between(today, a.getEndDate()),
            a.getStatus(),
            a.getLegalEntityId(),
            null,
            null,
            null,
            a.getAgreementCategory(),
            a.getAgreementCode(),
            a.getFileAttachmentId(),
            open == null ? null : open.getId(),
            open == null ? null : open.getRequestNo(),
            open == null ? null : open.getRequestType()
        ));
      }
    }
    return result;
  }

  private Map<String, ContractChangeRequestEntity> loadOpenRequestsBySourceKey() {
    List<ContractChangeRequestEntity> open = requestMapper.selectList(
        new LambdaQueryWrapper<ContractChangeRequestEntity>()
            .in(
                ContractChangeRequestEntity::getStatus,
                List.of(ContractChangeStatus.DRAFT, ContractChangeStatus.PENDING)
            )
    );
    Map<String, ContractChangeRequestEntity> map = new HashMap<>();
    for (ContractChangeRequestEntity e : open) {
      String key = e.getTargetKind() + ":" + e.getSourceRecordId();
      map.putIfAbsent(key, e);
    }
    return map;
  }

  private boolean matchKeyword(Long employeeId, String code, String keyword) {
    if (keyword == null || keyword.isBlank()) return true;
    String k = keyword.trim();
    if (code != null && code.contains(k)) return true;
    EmployeeEntity emp = employeeMapper.selectById(employeeId);
    if (emp == null) return false;
    return (emp.getEmployeeNo() != null && emp.getEmployeeNo().contains(k))
        || (emp.getFullName() != null && emp.getFullName().contains(k));
  }

  private SourceSnapshot requireSource(String targetKind, long employeeId, long sourceRecordId) {
    if (ContractChangeTypes.CONTRACT.equals(targetKind)) {
      EmployeeContractEntity c = contractMapper.selectById(sourceRecordId);
      if (c == null || !Objects.equals(c.getEmployeeId(), employeeId)) {
        throw new IllegalArgumentException("源合同不存在或不属于该员工");
      }
      return new SourceSnapshot(
          ContractChangeTypes.CONTRACT,
          c.getId(),
          c.getEmployeeId(),
          c.getContractCode(),
          c.getEndDate(),
          c.getStatus(),
          c.getLegalEntityId(),
          c.getContractCategory(),
          c.getContractCategoryDesc(),
          c.getContractCode(),
          null,
          null,
          c.getFileAttachmentId(),
          c.getStartDate(),
          c.getEffectiveStartDate()
      );
    }
    EmployeeAgreementEntity a = agreementMapper.selectById(sourceRecordId);
    if (a == null || !Objects.equals(a.getEmployeeId(), employeeId)) {
      throw new IllegalArgumentException("源协议不存在或不属于该员工");
    }
    return new SourceSnapshot(
        ContractChangeTypes.AGREEMENT,
        a.getId(),
        a.getEmployeeId(),
        a.getAgreementCode(),
        a.getEndDate(),
        a.getStatus(),
        a.getLegalEntityId(),
        null,
        null,
        null,
        a.getAgreementCategory(),
        a.getAgreementCode(),
        a.getFileAttachmentId(),
        a.getStartDate(),
        a.getEffectiveStartDate()
    );
  }

  private void assertNoOpenRequest(String targetKind, long sourceRecordId) {
    Long count = requestMapper.selectCount(
        new LambdaQueryWrapper<ContractChangeRequestEntity>()
            .eq(ContractChangeRequestEntity::getTargetKind, targetKind)
            .eq(ContractChangeRequestEntity::getSourceRecordId, sourceRecordId)
            .in(
                ContractChangeRequestEntity::getStatus,
                List.of(ContractChangeStatus.DRAFT, ContractChangeStatus.PENDING)
            )
    );
    if (count != null && count > 0) {
      throw new IllegalArgumentException("该档案已有进行中的续签/变更单");
    }
  }

  private void applyProposedFields(
      ContractChangeRequestEntity entity,
      CreateCommand cmd,
      SourceSnapshot source,
      boolean creating
  ) {
    entity.setProposedStartDate(cmd.proposedStartDate());
    entity.setProposedEndDate(cmd.proposedEndDate());
    entity.setProposedEffectiveStartDate(
        cmd.proposedEffectiveStartDate() != null
            ? cmd.proposedEffectiveStartDate()
            : cmd.proposedStartDate()
    );
    entity.setLegalEntityId(cmd.legalEntityId() != null ? cmd.legalEntityId() : source.legalEntityId());
    entity.setContractCategory(firstNonBlank(cmd.contractCategory(), source.contractCategory()));
    entity.setContractCategoryDesc(firstNonBlank(cmd.contractCategoryDesc(), source.contractCategoryDesc()));
    entity.setContractCode(firstNonBlank(cmd.contractCode(), source.contractCode()));
    entity.setAgreementCategory(firstNonBlank(cmd.agreementCategory(), source.agreementCategory()));
    entity.setAgreementCode(firstNonBlank(cmd.agreementCode(), source.agreementCode()));
    entity.setFileAttachmentId(
        cmd.fileAttachmentId() != null ? cmd.fileAttachmentId() : source.fileAttachmentId()
    );
    entity.setOpinion(blankToNull(cmd.opinion()));
    entity.setRemark(blankToNull(cmd.remark()));
    if (creating && ContractChangeTypes.CHANGE.equals(entity.getRequestType())) {
      fillMissingFromSource(entity, source);
    }
  }

  private void fillMissingFromSource(ContractChangeRequestEntity cur, SourceSnapshot source) {
    if (cur.getProposedEndDate() == null) cur.setProposedEndDate(source.endDate());
    if (cur.getProposedEffectiveStartDate() == null) {
      cur.setProposedEffectiveStartDate(
          source.effectiveStartDate() != null ? source.effectiveStartDate() : source.startDate()
      );
    }
    if (cur.getLegalEntityId() == null) cur.setLegalEntityId(source.legalEntityId());
    if (cur.getContractCategory() == null) cur.setContractCategory(source.contractCategory());
    if (cur.getContractCategoryDesc() == null) cur.setContractCategoryDesc(source.contractCategoryDesc());
    if (cur.getContractCode() == null) cur.setContractCode(source.contractCode());
    if (cur.getAgreementCategory() == null) cur.setAgreementCategory(source.agreementCategory());
    if (cur.getAgreementCode() == null) cur.setAgreementCode(source.agreementCode());
    if (cur.getFileAttachmentId() == null) cur.setFileAttachmentId(source.fileAttachmentId());
  }

  private void requireStatus(ContractChangeRequestEntity e, String expected) {
    if (!expected.equals(e.getStatus())) {
      throw new IllegalArgumentException("当前状态不允许此操作，期望 " + expected + "，实际 " + e.getStatus());
    }
  }

  private static String blankToNull(String v) {
    if (v == null) return null;
    String t = v.trim();
    return t.isEmpty() ? null : t;
  }

  private static String firstNonBlank(String a, String b) {
    String x = blankToNull(a);
    return x != null ? x : blankToNull(b);
  }

  private static Long currentUserId() {
    AuthUser u = AuthContext.current();
    return u == null ? null : u.id();
  }

  public record PageResult(List<ContractChangeRequestEntity> records, long total) {}

  public record ExpiringPageResult(List<ExpiringItem> records, long total) {}

  public record ScanResult(int scanned, int created) {}

  public record SourceSnapshot(
      String targetKind,
      Long recordId,
      Long employeeId,
      String code,
      LocalDate endDate,
      String status,
      Long legalEntityId,
      String contractCategory,
      String contractCategoryDesc,
      String contractCode,
      String agreementCategory,
      String agreementCode,
      Long fileAttachmentId,
      LocalDate startDate,
      LocalDate effectiveStartDate
  ) {}

  public record ExpiringItem(
      String targetKind,
      Long recordId,
      Long employeeId,
      String code,
      LocalDate endDate,
      int daysRemaining,
      String status,
      Long legalEntityId,
      String contractCategory,
      String contractCategoryDesc,
      String contractCode,
      String agreementCategory,
      String agreementCode,
      Long fileAttachmentId,
      Long openRequestId,
      String openRequestNo,
      String openRequestType
  ) {}

  public record CreateCommand(
      String requestType,
      String targetKind,
      Long employeeId,
      Long sourceRecordId,
      LocalDate proposedStartDate,
      LocalDate proposedEndDate,
      LocalDate proposedEffectiveStartDate,
      Long legalEntityId,
      String contractCategory,
      String contractCategoryDesc,
      String contractCode,
      String agreementCategory,
      String agreementCode,
      Long fileAttachmentId,
      String opinion,
      String remark
  ) {}

  public record UpdateCommand(
      LocalDate proposedStartDate,
      LocalDate proposedEndDate,
      LocalDate proposedEffectiveStartDate,
      Long legalEntityId,
      String contractCategory,
      String contractCategoryDesc,
      String contractCode,
      String agreementCategory,
      String agreementCode,
      Long fileAttachmentId,
      String opinion,
      String remark
  ) {}
}
