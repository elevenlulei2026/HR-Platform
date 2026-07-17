package com.hrplatform.platform.auth;

public class PasswordChangeRequiredException extends RuntimeException {
  public PasswordChangeRequiredException() {
    super("请先修改密码后再使用系统功能");
  }
}
