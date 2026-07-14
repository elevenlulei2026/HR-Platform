package com.hrplatform.core.employee;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 档案批管资源注册表：菜单 path、权限分区、是否已接入批管能力。
 * 阶段 1 仅 id-documents 为 supported=true。
 */
public final class ArchiveDataResourceRegistry {
  private ArchiveDataResourceRegistry() {}

  public record ResourceMeta(
      String path,
      String title,
      String section,
      boolean supported,
      String description
  ) {}

  private static final Map<String, ResourceMeta> BY_PATH = new LinkedHashMap<>();

  static {
    // 个人信息
    put("id-documents", "证件信息", "personal", true, "跨员工证件信息批管（试点）");
    put("family-members", "家庭成员", "personal", true, "跨员工家庭成员批管");
    put("internal-relatives", "内部亲属", "personal", true, "跨员工内部亲属批管");
    // 工作信息（合同/协议权限分区与现有档案 API 一致为 service）
    put("cost-center-allocations", "成本中心", "work", true, "跨员工成本中心分摊批管");
    put("contracts", "合同信息", "service", true, "跨员工合同档案批管");
    put("agreements", "协议信息", "service", true, "跨员工协议档案批管");
    // 员工服务
    put("attendance-cards", "考勤卡", "service", false, "跨员工考勤卡批管");
    put("bank-accounts", "银行卡", "service", false, "跨员工银行卡批管");
    put("social-insurances", "社保公积金", "service", false, "跨员工社保公积金批管");
    put("special-benefits", "特殊福利", "service", false, "跨员工特殊福利批管");
    put("work-injuries", "工伤信息", "service", false, "跨员工工伤信息批管");
    put("admin-infos", "行政信息", "service", false, "跨员工行政信息批管");
    put("accommodations", "住宿信息", "service", false, "跨员工住宿信息批管");
    put("attachments", "附件", "service", false, "跨员工附件批管");
    // 背景信息
    put("educations", "教育经历", "background", false, "跨员工教育经历批管");
    put("work-experiences", "工作经历", "background", false, "跨员工工作经历批管");
    put("qualifications", "资格证书", "background", false, "跨员工资格证书批管");
    put("title-certificates", "职称证书", "background", false, "跨员工职称证书批管");
    put("rewards", "奖励记录", "background", false, "跨员工奖励记录批管");
    put("penalties", "惩处记录", "background", false, "跨员工惩处记录批管");
    // 人才发展
    put("training-records", "培训记录", "development", false, "跨员工培训记录批管");
    put("performance-records", "绩效记录", "development", false, "跨员工绩效记录批管");
    put("values-assessments", "价值观评估", "development", false, "跨员工价值观评估批管");
    put("talent-reviews", "人才盘点", "development", false, "跨员工人才盘点批管");
    put("projects", "项目信息", "development", false, "跨员工项目信息批管");
    put("agent-assignments", "智能体归属", "development", false, "跨员工智能体归属批管");
  }

  private static void put(String path, String title, String section, boolean supported, String description) {
    BY_PATH.put(path, new ResourceMeta(path, title, section, supported, description));
  }

  public static List<ResourceMeta> all() {
    return new ArrayList<>(BY_PATH.values());
  }

  public static Optional<ResourceMeta> find(String path) {
    if (path == null || path.isBlank()) return Optional.empty();
    return Optional.ofNullable(BY_PATH.get(path.trim()));
  }

  public static ResourceMeta require(String path) {
    return find(path).orElseThrow(() -> new IllegalArgumentException("未知档案批管资源: " + path));
  }

  public static ResourceMeta requireSupported(String path) {
    ResourceMeta meta = require(path);
    if (!meta.supported()) {
      throw new IllegalArgumentException(
          meta.title() + "的批量管理能力建设中。参考证件信息实现 ArchiveDataResourceHandler 后，将 supported 设为 true。"
      );
    }
    return meta;
  }
}
