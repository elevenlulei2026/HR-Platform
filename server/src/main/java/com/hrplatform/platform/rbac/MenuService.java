package com.hrplatform.platform.rbac;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MenuService {
  private final MenuMapper menuMapper;

  public MenuService(MenuMapper menuMapper) {
    this.menuMapper = menuMapper;
  }

  public List<MenuEntity> listAllActive() {
    return menuMapper.selectList(
        new LambdaQueryWrapper<MenuEntity>()
            .eq(MenuEntity::getStatus, RbacStatus.ACTIVE)
            .orderByAsc(MenuEntity::getSortOrder)
            .orderByAsc(MenuEntity::getId)
    );
  }

  public List<MenuTreeNode> getTreeForUser(Set<String> permissions) {
    List<MenuEntity> all = listAllActive();
    return buildTree(all, null, permissions, true);
  }

  public List<MenuTreeNode> getAdminTree() {
    List<MenuEntity> all = menuMapper.selectList(
        new LambdaQueryWrapper<MenuEntity>()
            .orderByAsc(MenuEntity::getSortOrder)
            .orderByAsc(MenuEntity::getId)
    );
    return buildTree(all, null, null, false);
  }

  public MenuEntity require(long id) {
    MenuEntity e = menuMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("菜单不存在");
    return e;
  }

  @Transactional
  public MenuEntity create(MenuEntity entity) {
    if (entity.getCode() == null || entity.getCode().isBlank()) {
      throw new IllegalArgumentException("菜单 code 不能为空");
    }
    if (entity.getTitle() == null || entity.getTitle().isBlank()) {
      throw new IllegalArgumentException("菜单名称不能为空");
    }
    Long dup = menuMapper.selectCount(
        new LambdaQueryWrapper<MenuEntity>().eq(MenuEntity::getCode, entity.getCode().trim())
    );
    if (dup != null && dup > 0) throw new IllegalArgumentException("菜单 code 已存在");
    entity.setCode(entity.getCode().trim());
    entity.setTitle(entity.getTitle().trim());
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus(RbacStatus.ACTIVE);
    if (entity.getMenuType() == null || entity.getMenuType().isBlank()) entity.setMenuType("ITEM");
    if (entity.getSortOrder() == null) entity.setSortOrder(0);
    menuMapper.insert(entity);
    return require(entity.getId());
  }

  @Transactional
  public MenuEntity update(long id, MenuEntity patch) {
    MenuEntity cur = require(id);
    if (patch.getTitle() != null) cur.setTitle(patch.getTitle().trim());
    if (patch.getPath() != null) cur.setPath(patch.getPath().isBlank() ? null : patch.getPath().trim());
    if (patch.getIcon() != null) cur.setIcon(patch.getIcon().isBlank() ? null : patch.getIcon().trim());
    if (patch.getMenuType() != null) cur.setMenuType(patch.getMenuType());
    if (patch.getPermissionCode() != null) {
      cur.setPermissionCode(patch.getPermissionCode().isBlank() ? null : patch.getPermissionCode().trim());
    }
    if (patch.getSortOrder() != null) cur.setSortOrder(patch.getSortOrder());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    // 说明允许清空：空串也要写入（MyBatis-Plus 默认忽略 null，不能用 null 表示清空）
    if (patch.getDescription() != null) cur.setDescription(patch.getDescription().trim());
    if (patch.getParentId() != null) cur.setParentId(patch.getParentId());
    menuMapper.updateById(cur);
    return require(id);
  }

  @Transactional
  public void disable(long id) {
    MenuEntity cur = require(id);
    if ("DISABLED".equals(cur.getStatus())) return;
    cur.setStatus(RbacStatus.DISABLED);
    menuMapper.updateById(cur);
  }

  private List<MenuTreeNode> buildTree(
      List<MenuEntity> all,
      Long parentId,
      Set<String> permissions,
      boolean filterByPermission
  ) {
    return all.stream()
        .filter(m -> parentId == null ? m.getParentId() == null : parentId.equals(m.getParentId()))
        .sorted(Comparator.comparingInt(m -> m.getSortOrder() == null ? 0 : m.getSortOrder()))
        .map(m -> {
          List<MenuTreeNode> children = buildTree(all, m.getId(), permissions, filterByPermission);
          boolean selfAllowed = !filterByPermission || canSeeMenu(m, permissions);
          if (filterByPermission && !selfAllowed && children.isEmpty()) return null;
          return new MenuTreeNode(m, children.stream().filter(c -> c != null).toList());
        })
        .filter(node -> node != null && (!filterByPermission || canSeeMenu(node.entity(), permissions) || !node.children().isEmpty()))
        .toList();
  }

  private boolean canSeeMenu(MenuEntity m, Set<String> permissions) {
    if (permissions == null) return true;
    String code = m.getPermissionCode();
    if (code == null || code.isBlank()) return true;
    return permissions.contains(code);
  }

  public Map<String, Object> toDto(MenuEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", String.valueOf(e.getId()));
    dto.put("parentId", e.getParentId() == null ? null : String.valueOf(e.getParentId()));
    dto.put("code", e.getCode());
    dto.put("title", e.getTitle());
    dto.put("path", e.getPath());
    dto.put("icon", e.getIcon());
    dto.put("menuType", e.getMenuType());
    dto.put("permissionCode", e.getPermissionCode());
    dto.put("sortOrder", e.getSortOrder());
    dto.put("status", e.getStatus());
    dto.put("description", e.getDescription());
    return dto;
  }

  public Map<String, Object> toTreeDto(MenuTreeNode node) {
    Map<String, Object> dto = toDto(node.entity());
    dto.put("children", node.children().stream().map(this::toTreeDto).toList());
    return dto;
  }

  public record MenuTreeNode(MenuEntity entity, List<MenuTreeNode> children) {}
}
