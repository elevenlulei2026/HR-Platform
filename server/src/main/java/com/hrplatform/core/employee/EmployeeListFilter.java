package com.hrplatform.core.employee;

import java.time.LocalDate;

public record EmployeeListFilter(
    String filterMode,
    String keyword,
    String fullName,
    String employeeNo,
    String companyEmail,
    String personalEmail,
    Long organizationId,
    Long positionId,
    String status,
    String gender,
    LocalDate hireDateFrom,
    LocalDate hireDateTo,
    LocalDate asOfDate,
    String sortBy,
    String sortOrder
) {
  public boolean isAdvanced() {
    return filterMode != null && "ADVANCED".equalsIgnoreCase(filterMode.trim());
  }

  public LocalDate snapshotDate() {
    return asOfDate == null ? LocalDate.now() : asOfDate;
  }
}
