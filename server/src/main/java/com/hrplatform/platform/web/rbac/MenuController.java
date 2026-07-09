package com.hrplatform.platform.web.rbac;

import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.rbac.MenuEntity;
import com.hrplatform.platform.rbac.MenuService;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.rbac.RequirePermission;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1")
public class MenuController {
  private final MenuService menuService;
  private final RbacService rbacService;

  public MenuController(MenuService menuService, RbacService rbacService) {
    this.menuService = menuService;
    this.rbacService = rbacService;
  }

  /** 当前用户可见的导航树（登录即可） */
  @GetMapping("/menus/nav-tree")
  public ApiResponse<List<Map<String, Object>>> getNavTree() {
    rbacService.requireLoggedIn();
    Set<String> permissions = rbacService.getCurrentUserPermissions();
    return ApiResponse.ok(
        menuService.getTreeForUser(permissions).stream().map(menuService::toTreeDto).toList()
    );
  }

  /** 管理端完整菜单树 */
  @GetMapping("/menus/tree")
  @RequirePermission("permission:manage")
  public ApiResponse<List<Map<String, Object>>> getAdminTree() {
    return ApiResponse.ok(
        menuService.getAdminTree().stream().map(menuService::toTreeDto).toList()
    );
  }

  @PostMapping("/menus")
  @RequirePermission("permission:manage")
  public ApiResponse<Map<String, Object>> create(@Valid @RequestBody MenuCreateRequest req) {
    MenuEntity e = new MenuEntity();
    e.setParentId(req.parentId());
    e.setCode(req.code());
    e.setTitle(req.title());
    e.setPath(req.path());
    e.setIcon(req.icon());
    e.setMenuType(req.menuType());
    e.setPermissionCode(req.permissionCode());
    e.setSortOrder(req.sortOrder());
    e.setStatus(req.status());
    e.setDescription(req.description());
    return ApiResponse.ok(menuService.toDto(menuService.create(e)));
  }

  @PutMapping("/menus/{id}")
  @RequirePermission("permission:manage")
  public ApiResponse<Map<String, Object>> update(
      @PathVariable long id,
      @Valid @RequestBody MenuUpdateRequest req
  ) {
    MenuEntity patch = new MenuEntity();
    patch.setParentId(req.parentId());
    patch.setTitle(req.title());
    patch.setPath(req.path());
    patch.setIcon(req.icon());
    patch.setMenuType(req.menuType());
    patch.setPermissionCode(req.permissionCode());
    patch.setSortOrder(req.sortOrder());
    patch.setStatus(req.status());
    patch.setDescription(req.description());
    return ApiResponse.ok(menuService.toDto(menuService.update(id, patch)));
  }

  @DeleteMapping("/menus/{id}")
  @RequirePermission("permission:manage")
  public ApiResponse<Map<String, Object>> delete(@PathVariable long id) {
    menuService.disable(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  public record MenuCreateRequest(
      Long parentId,
      @NotBlank String code,
      @NotBlank String title,
      String path,
      String icon,
      String menuType,
      String permissionCode,
      Integer sortOrder,
      String status,
      String description
  ) {}

  public record MenuUpdateRequest(
      Long parentId,
      String title,
      String path,
      String icon,
      String menuType,
      String permissionCode,
      Integer sortOrder,
      String status,
      String description
  ) {}
}
