package com.hrplatform.platform.rbac;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Aspect
@Component
public class PermissionAspect {
  private final RbacService rbacService;

  public PermissionAspect(RbacService rbacService) {
    this.rbacService = rbacService;
  }

  @Before("@annotation(com.hrplatform.platform.rbac.RequirePermission) || @within(com.hrplatform.platform.rbac.RequirePermission)")
  public void beforeRequirePermission(JoinPoint jp) {
    RequirePermission ann = resolveAnnotation(jp, RequirePermission.class);
    if (ann == null) return;
    for (String code : ann.value()) {
      rbacService.requirePermission(code);
    }
  }

  @Before("@annotation(com.hrplatform.platform.rbac.RequireAnyPermission) || @within(com.hrplatform.platform.rbac.RequireAnyPermission)")
  public void beforeRequireAnyPermission(JoinPoint jp) {
    RequireAnyPermission ann = resolveAnnotation(jp, RequireAnyPermission.class);
    if (ann == null) return;
    rbacService.requireAnyPermission(ann.value());
  }

  private static <A extends java.lang.annotation.Annotation> A resolveAnnotation(
      JoinPoint jp,
      Class<A> type
  ) {
    MethodSignature signature = (MethodSignature) jp.getSignature();
    Method method = signature.getMethod();
    A onMethod = AnnotatedElementUtils.findMergedAnnotation(method, type);
    if (onMethod != null) return onMethod;
    return AnnotatedElementUtils.findMergedAnnotation(method.getDeclaringClass(), type);
  }
}
