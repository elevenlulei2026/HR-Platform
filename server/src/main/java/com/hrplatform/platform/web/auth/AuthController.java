package com.hrplatform.platform.web.auth;

import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthService;
import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService authService;
  private final RbacService rbacService;

  public AuthController(AuthService authService, RbacService rbacService) {
    this.authService = authService;
    this.rbacService = rbacService;
  }

  @PostMapping("/login")
  public ApiResponse<Map<String, Object>> login(@Valid @RequestBody LoginRequest req) {
    AuthService.LoginResult result = authService.login(req.username(), req.password());
    SysUserEntity user = result.user();
    Map<String, Object> profile = userProfileWithRbac(user);

    return ApiResponse.ok(
        Map.of(
            "token", result.token().token(),
            "tokenType", "Bearer",
            "expiresAt", result.token().expiresAt().toString(),
            "user", profile
        )
    );
  }

  @GetMapping("/me")
  public ApiResponse<Map<String, Object>> me() {
    if (AuthContext.current() == null) {
      throw new com.hrplatform.platform.auth.UnauthorizedException("未登录或登录已过期");
    }
    Long userId = AuthContext.current().id();
    SysUserEntity user = authService.requireUser(userId);
    return ApiResponse.ok(userProfileWithRbac(user));
  }

  private Map<String, Object> userProfileWithRbac(SysUserEntity user) {
    Map<String, Object> profile = new HashMap<>();
    profile.put("id", String.valueOf(user.getId()));
    profile.put("username", user.getUsername());
    profile.put("status", user.getStatus());
    profile.put("employeeId", user.getEmployeeId() == null ? null : String.valueOf(user.getEmployeeId()));
    profile.put("lastLoginAt", user.getLastLoginAt() == null ? null : user.getLastLoginAt().toString());
    var rbac = rbacService.loadUserRbac(user.getId());
    profile.put("roles", rbac.roles());
    profile.put("permissions", rbac.permissions());
    return profile;
  }

  public record LoginRequest(
      @NotBlank(message = "请输入用户名") String username,
      @NotBlank(message = "请输入密码") String password
  ) {}
}

