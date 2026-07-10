package com.hrplatform.platform.rbac;

import org.springframework.stereotype.Component;

import java.util.Map;

/** 员工档案二级模块 → 权限分区映射 */
@Component
public class ArchivePermissionSupport {
  private static final Map<String, String> RESOURCE_SECTION = Map.ofEntries(
      Map.entry("family-members", "personal"),
      Map.entry("internal-relatives", "personal"),
      Map.entry("id-documents", "personal"),
      Map.entry("cost-center-allocations", "work"),
      Map.entry("contracts", "service"),
      Map.entry("agreements", "service"),
      Map.entry("attendance-cards", "service"),
      Map.entry("bank-accounts", "service"),
      Map.entry("social-insurances", "service"),
      Map.entry("special-benefits", "service"),
      Map.entry("work-injuries", "service"),
      Map.entry("admin-infos", "service"),
      Map.entry("accommodations", "service"),
      Map.entry("attachments", "service"),
      Map.entry("educations", "background"),
      Map.entry("work-experiences", "background"),
      Map.entry("qualifications", "background"),
      Map.entry("rewards", "background"),
      Map.entry("penalties", "background"),
      Map.entry("training-records", "development"),
      Map.entry("performance-records", "development"),
      Map.entry("values-assessments", "development"),
      Map.entry("talent-reviews", "development"),
      Map.entry("projects", "development"),
      Map.entry("agent-assignments", "development")
  );

  private final RbacService rbacService;

  public ArchivePermissionSupport(RbacService rbacService) {
    this.rbacService = rbacService;
  }

  public void requireView(String resource) {
    rbacService.requireAnyPermission(
        archiveCode(resource, "view"),
        "employee:roster:view"
    );
  }

  public void requireCreate(String resource) {
    rbacService.requireAnyPermission(
        archiveCode(resource, "create"),
        archiveCode(resource, "edit"),
        "employee:edit"
    );
  }

  public void requireEdit(String resource) {
    rbacService.requireAnyPermission(
        archiveCode(resource, "edit"),
        "employee:edit"
    );
  }

  public void requireDelete(String resource) {
    rbacService.requireAnyPermission(
        archiveCode(resource, "delete"),
        archiveCode(resource, "edit"),
        "employee:edit"
    );
  }

  public String sectionFor(String resource) {
    String section = RESOURCE_SECTION.get(resource);
    if (section == null) {
      throw new IllegalArgumentException("未知档案资源: " + resource);
    }
    return section;
  }

  private String archiveCode(String resource, String action) {
    return "employee:archive:" + sectionFor(resource) + ":" + action;
  }
}
