package com.hrplatform.platform.audit;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditLogService {
  private final AuditLogMapper auditLogMapper;

  public AuditLogService(AuditLogMapper auditLogMapper) {
    this.auditLogMapper = auditLogMapper;
  }

  public void append(AuditLogEntity entity) {
    auditLogMapper.insert(entity);
  }

  public PageResult page(Query query) {
    LambdaQueryWrapper<AuditLogEntity> qw = new LambdaQueryWrapper<AuditLogEntity>()
        .orderByDesc(AuditLogEntity::getCreatedAt);

    if (query.action() != null && !query.action().isBlank()) {
      qw.eq(AuditLogEntity::getAction, query.action());
    }
    if (query.resourceType() != null && !query.resourceType().isBlank()) {
      qw.eq(AuditLogEntity::getResourceType, query.resourceType());
    }
    if (query.operatorUsername() != null && !query.operatorUsername().isBlank()) {
      qw.like(AuditLogEntity::getOperatorUsername, query.operatorUsername());
    }
    if (query.from() != null) {
      qw.ge(AuditLogEntity::getCreatedAt, query.from());
    }
    if (query.to() != null) {
      qw.le(AuditLogEntity::getCreatedAt, query.to());
    }

    long page = Math.max(1, query.page());
    long pageSize = Math.max(1, query.pageSize());
    long offset = (page - 1) * pageSize;

    Long total = auditLogMapper.selectCount(qw);
    qw.last("LIMIT " + offset + ", " + pageSize);
    List<AuditLogEntity> records = auditLogMapper.selectList(qw);
    return new PageResult(records, total == null ? 0 : total);
  }

  public record Query(
      String action,
      String resourceType,
      String operatorUsername,
      java.time.LocalDateTime from,
      java.time.LocalDateTime to,
      long page,
      long pageSize
  ) {}

  public record PageResult(List<AuditLogEntity> records, long total) {}
}

