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

@Component
@Order(20)
public class AuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final com.hrplatform.platform.rbac.RbacService rbacService;

  public AuthFilter(JwtService jwtService, com.hrplatform.platform.rbac.RbacService rbacService) {
    this.jwtService = jwtService;
    this.rbacService = rbacService;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    // CORS 预检请求必须放行，否则浏览器会直接报跨域失败
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
    // #region agent log
    com.hrplatform.platform.debug.DebugLog.logAbs(
        "pre-fix",
        "S1",
        "server/AuthFilter",
        "AuthFilter enter",
        Map.of("path", request.getRequestURI(), "method", request.getMethod(), "hasAuthHeader", request.getHeader("Authorization") != null)
    );
    // #endregion agent log

    String auth = request.getHeader("Authorization");
    if (auth == null || auth.isBlank() || !auth.startsWith("Bearer ")) {
      // #region agent log
      com.hrplatform.platform.debug.DebugLog.logAbs(
          "pre-fix",
          "S1",
          "server/AuthFilter",
          "AuthFilter unauthorized (missing/invalid header)",
          Map.of("path", request.getRequestURI(), "method", request.getMethod())
      );
      // #endregion agent log
      writeUnauthorized(response, "未登录或登录已过期");
      return;
    }

    String token = auth.substring("Bearer ".length()).trim();
    if (token.isBlank()) {
      // #region agent log
      com.hrplatform.platform.debug.DebugLog.logAbs(
          "pre-fix",
          "S1",
          "server/AuthFilter",
          "AuthFilter unauthorized (blank token)",
          Map.of("path", request.getRequestURI(), "method", request.getMethod())
      );
      // #endregion agent log
      writeUnauthorized(response, "未登录或登录已过期");
      return;
    }

    try {
      AuthUser user = rbacService.enrich(jwtService.verify(token));
      // #region agent log
      com.hrplatform.platform.debug.DebugLog.logAbs(
          "pre-fix",
          "S1",
          "server/AuthFilter",
          "AuthFilter verified",
          Map.of(
              "path", request.getRequestURI(),
              "userId", user.id(),
              "username", user.username(),
              "roles", user.roles() == null ? 0 : user.roles().size(),
              "permissions", user.permissions() == null ? 0 : user.permissions().size()
          )
      );
      // #endregion agent log
      AuthContext.set(user);
      try {
        filterChain.doFilter(request, response);
      } finally {
        AuthContext.clear();
      }
    } catch (UnauthorizedException ex) {
      // #region agent log
      com.hrplatform.platform.debug.DebugLog.logAbs(
          "pre-fix",
          "S1",
          "server/AuthFilter",
          "AuthFilter unauthorized (verify failed)",
          Map.of("path", request.getRequestURI(), "message", ex.getMessage())
      );
      // #endregion agent log
      writeUnauthorized(response, ex.getMessage());
    }
  }

  private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
    response.setStatus(401);
    response.setCharacterEncoding("UTF-8");
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    String body = Jsons.write(ApiResponse.fail("UNAUTHORIZED", message));
    response.getWriter().write(body);
  }
}

