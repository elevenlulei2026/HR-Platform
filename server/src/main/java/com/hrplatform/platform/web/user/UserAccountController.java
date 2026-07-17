package com.hrplatform.platform.web.user;

import com.hrplatform.core.employee.EmployeeAccountBindingService;
import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.auth.UserAccountService;
import com.hrplatform.platform.rbac.RequirePermission;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class UserAccountController {
  private final UserAccountService userAccountService;
  private final EmployeeAccountBindingService bindingService;

  public UserAccountController(
      UserAccountService userAccountService,
      EmployeeAccountBindingService bindingService
  ) {
    this.userAccountService = userAccountService;
    this.bindingService = bindingService;
  }

  @GetMapping("/users")
  @RequirePermission("user:manage")
  public ApiResponse<Map<String, Object>> list(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String roleCode,
      @RequestParam(required = false) String accountType,
      @RequestParam(required = false) String boundEmployee,
      @RequestParam @Min(1) long page,
      @RequestParam @Min(1) @Max(200) long pageSize
  ) {
    List<Long> employeeIdsByKeyword = bindingService.findEmployeeIdsByKeyword(keyword);
    UserAccountService.PageResult p = userAccountService.page(
        new UserAccountService.ListQuery(
            keyword, status, roleCode, accountType, boundEmployee, employeeIdsByKeyword, page, pageSize
        )
    );
    List<Map<String, Object>> items = userAccountService.toAccountMaps(p.records());
    bindingService.enrichAccountMaps(items);

    Map<String, Object> result = new HashMap<>();
    result.put("items", items);
    result.put("total", p.total());
    result.put("page", p.page());
    result.put("pageSize", p.pageSize());
    return ApiResponse.ok(result);
  }

  @GetMapping("/users/{id}")
  @RequirePermission("user:manage")
  public ApiResponse<Map<String, Object>> get(@PathVariable("id") long id) {
    SysUserEntity user = userAccountService.require(id);
    Map<String, Object> map = userAccountService.toAccountMaps(List.of(user)).get(0);
    bindingService.enrichAccountMaps(List.of(map));
    return ApiResponse.ok(map);
  }

  @PostMapping("/users")
  @RequirePermission("user:manage")
  public ApiResponse<Map<String, Object>> create(@Valid @RequestBody CreateSystemUserRequest req) {
    if (req.accountType() == null || !"SYSTEM".equalsIgnoreCase(req.accountType())) {
      throw new IllegalArgumentException("本接口仅支持创建系统账号，员工开号请使用 POST /employees/{id}/open-account");
    }
    SysUserEntity user = userAccountService.createSystemAccount(
        req.username(),
        req.displayName(),
        req.password(),
        req.roleCodes(),
        req.mustChangePassword()
    );
    Map<String, Object> map = userAccountService.toAccountMaps(List.of(user)).get(0);
    bindingService.enrichAccountMaps(List.of(map));
    return ApiResponse.ok(map);
  }

  @PutMapping("/users/{id}")
  @RequirePermission("user:manage")
  public ApiResponse<Map<String, Object>> update(
      @PathVariable("id") long id,
      @Valid @RequestBody UpdateUserRequest req
  ) {
    if (req.status() != null && "ACTIVE".equalsIgnoreCase(req.status().trim())) {
      bindingService.ensureEmployeeCanEnable(id);
    }
    SysUserEntity user = userAccountService.update(id, req.displayName(), req.status());
    Map<String, Object> map = userAccountService.toAccountMaps(List.of(user)).get(0);
    bindingService.enrichAccountMaps(List.of(map));
    return ApiResponse.ok(map);
  }

  @PostMapping("/users/{id}/reset-password")
  @RequirePermission("user:manage")
  public ApiResponse<Map<String, Object>> resetPassword(
      @PathVariable("id") long id,
      @Valid @RequestBody ResetPasswordRequest req
  ) {
    userAccountService.resetPassword(id, req.newPassword(), req.mustChangePassword());
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  @PostMapping("/users/{id}/rename-login")
  @RequirePermission("user:manage")
  public ApiResponse<Map<String, Object>> renameLogin(
      @PathVariable("id") long id,
      @Valid @RequestBody RenameLoginRequest req
  ) {
    return ApiResponse.ok(bindingService.renameLoginByUserId(id, req.newAdAccount()));
  }

  public record CreateSystemUserRequest(
      @NotBlank String accountType,
      @NotBlank String username,
      String displayName,
      @NotBlank String password,
      List<String> roleCodes,
      Boolean mustChangePassword
  ) {}

  public record UpdateUserRequest(String displayName, String status) {}

  public record ResetPasswordRequest(@NotBlank String newPassword, Boolean mustChangePassword) {}

  public record RenameLoginRequest(@NotBlank String newAdAccount) {}
}
