package com.hrplatform.platform.rbac;

import com.hrplatform.platform.auth.AuthContext;
import com.hrplatform.platform.auth.AuthUser;

/**
 * Slice 3.2（最小可用）：数据范围解析器。
 * - SELF / DEPARTMENT / ALL
 * - 目前仅给出解析结果与判断函数；具体业务过滤（如员工花名册）在 Slice 7 接入。
 */
public class DataScopeResolver {
  private DataScopeResolver() {}

  public static DataScope current() {
    AuthUser u = AuthContext.current();
    if (u == null || u.dataScope() == null || u.dataScope().isBlank()) return DataScope.SELF;
    try {
      return DataScope.valueOf(u.dataScope().trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      return DataScope.SELF;
    }
  }

  public static boolean canAccessAll() {
    return current() == DataScope.ALL;
  }

  public static boolean canAccessDepartment() {
    DataScope s = current();
    return s == DataScope.ALL || s == DataScope.DEPARTMENT;
  }
}

