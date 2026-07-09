package com.hrplatform.platform.rbac;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/**
 * 按权限 code 规则解析所属菜单（ITEM）。与 V36 迁移脚本规则保持一致。
 */
@Component
public class PermissionMenuResolver {
  private final MenuMapper menuMapper;
  private volatile Map<String, Long> menuIdByCode = Map.of();
  private volatile long loadedAt = 0;

  public PermissionMenuResolver(MenuMapper menuMapper) {
    this.menuMapper = menuMapper;
  }

  public Long resolve(String permissionCode) {
    if (permissionCode == null || permissionCode.isBlank()) return null;
    String code = permissionCode.trim();
    Map<String, Long> menus = menuCache();
    for (Rule rule : RULES) {
      if (rule.matcher.test(code)) {
        Long menuId = menus.get(rule.menuCode);
        if (menuId != null) return menuId;
      }
    }
    return null;
  }

  private Map<String, Long> menuCache() {
    long now = System.currentTimeMillis();
    if (now - loadedAt < 60_000 && !menuIdByCode.isEmpty()) return menuIdByCode;
    List<MenuEntity> items = menuMapper.selectList(
        new LambdaQueryWrapper<MenuEntity>()
            .eq(MenuEntity::getMenuType, "ITEM")
            .eq(MenuEntity::getStatus, RbacStatus.ACTIVE)
    );
    Map<String, Long> map = new HashMap<>();
    for (MenuEntity item : items) {
      if (item.getCode() != null && item.getId() != null) {
        map.put(item.getCode(), item.getId());
      }
    }
    menuIdByCode = map;
    loadedAt = now;
    return map;
  }

  public void invalidateCache() {
    loadedAt = 0;
    menuIdByCode = Map.of();
  }

  private record Rule(String menuCode, Predicate<String> matcher) {}

  private static final Rule[] RULES = new Rule[] {
      new Rule("tasks", c -> c.startsWith("workflow:task:")),
      new Rule("workflow", c -> c.startsWith("workflow:")),
      new Rule("employee_roster", c ->
          c.startsWith("employee:roster:")
              || c.startsWith("employee:archive:")
              || c.equals("employee:edit")
              || c.equals("employee:export")
              || c.equals("employee:sensitive:view")),
      new Rule("org_structure", c -> c.startsWith("organization:")),
      new Rule("org_positions", c -> c.startsWith("position:")),
      new Rule("org_headcount", c -> c.startsWith("headcount:")),
      new Rule("reporting_lines", c -> c.startsWith("reporting-line:")),
      new Rule("onboarding", c -> c.startsWith("onboarding:")),
      new Rule("movements", c -> c.startsWith("employee:movement:")),
      new Rule("offboarding", c -> c.startsWith("offboarding:")),
      new Rule("contracts", c -> c.startsWith("contract:")),
      new Rule("permissions", c -> c.startsWith("permission:")),
      new Rule("audit", c -> c.startsWith("audit:")),
      new Rule("settings", c -> c.startsWith("settings:") || c.equals("dict:manage")),
      new Rule("reports", c -> c.startsWith("report:")),
      new Rule("dashboard", c -> c.startsWith("dashboard:")),
      new Rule("dev_health", c -> c.startsWith("dev:")),
  };
}
