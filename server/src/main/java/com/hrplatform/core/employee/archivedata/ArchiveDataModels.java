package com.hrplatform.core.employee.archivedata;

import java.util.List;
import java.util.Map;

/**
 * 档案批管共享模型。新增 resource Handler 时复用，勿在业务 Handler 内再定义一套。
 */
public final class ArchiveDataModels {
  private ArchiveDataModels() {}

  public record PageResult<T>(List<T> records, long total) {}

  public record ImportResult(int totalRows, int successCount, int failureCount, List<RowError> errors) {}

  public record RowError(int rowNumber, String field, String message) {}

  /** 导入行级校验失败（被批量导入吞并为错误报告行） */
  public static class RowImportException extends RuntimeException {
    private final String field;

    public RowImportException(String field, String message) {
      super(message);
      this.field = field;
    }

    public String field() {
      return field;
    }
  }

  public record ListFilter(
      String keyword,
      String employeeNo,
      Long organizationId,
      boolean revealSensitive,
      long page,
      long pageSize
  ) {}

  public record ExportFilter(
      String keyword,
      String employeeNo,
      Long organizationId,
      boolean revealSensitive
  ) {}
}
