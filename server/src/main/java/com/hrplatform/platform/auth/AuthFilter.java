package com.hrplatform.platform.auth;

import com.hrplatform.platform.web.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Component
@Order(20)
public class AuthFilter extends OncePerRequestFilter {
  private static final Set<String> PASSWORD_CHANGE_EXEMPT = Set.of(
      "/api/v1/auth/me",
      "/api/v1/auth/password"
  );

  private final JwtService jwtService;
  private final AuthService authService;
  private final com.hrplatform.platform.rbac.RbacService rbacService;

  public AuthFilter(
      JwtService jwtService,
      AuthService authService,
      com.hrplatform.platform.rbac.RbacService rbacService
  ) {
    this.jwtService = jwtService;
    this.authService = authService;
    this.rbacService = rbacService;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
    if ("/api/v1/health".equals(path)) return true;
    return "/api/v1/auth/login".equals(path);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String auth = request.getHeader("Authorization");
    if (auth == null || auth.isBlank() || !auth.startsWith("Bearer ")) {
      writeJson(response, 401, "UNAUTHORIZED", "未登录或登录已过期");
      return;
    }

    String token = auth.substring("Bearer ".length()).trim();
    if (token.isBlank()) {
      writeJson(response, 401, "UNAUTHORIZED", "未登录或登录已过期");
      return;
    }

    try {
      AuthUser verified = jwtService.verify(token);
      // 每次请求校验账号仍为 ACTIVE（停用立即失效）
      SysUserEntity entity = authService.requireUser(verified.id());
      AuthUser user = rbacService.enrich(verified);
      AuthContext.set(user);
      try {
        String path = request.getRequestURI();
        if (entity.mustChangePassword() && !PASSWORD_CHANGE_EXEMPT.contains(path)) {
          writeJson(response, 403, "PASSWORD_CHANGE_REQUIRED", "请先修改密码后再使用系统功能");
          return;
        }
        filterChain.doFilter(request, response);
      } finally {
        AuthContext.clear();
      }
    } catch (UnauthorizedException ex) {
      writeJson(response, 401, "UNAUTHORIZED", ex.getMessage());
    }
  }

  private void writeJson(HttpServletResponse response, int status, String code, String message) throws IOException {
    response.setStatus(status);
    response.setCharacterEncoding("UTF-8");
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(Jsons.write(ApiResponse.fail(code, message)));
  }
}
