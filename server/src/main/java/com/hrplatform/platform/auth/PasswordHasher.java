package com.hrplatform.platform.auth;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
public class PasswordHasher {
  private static final String PREFIX_SHA256 = "sha256:";
  private static final String PREFIX_BCRYPT = "bcrypt:";

  private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

  public boolean matches(String rawPassword, String storedHash) {
    if (storedHash == null || storedHash.isBlank()) return false;
    if (storedHash.startsWith(PREFIX_BCRYPT)) {
      return bcrypt.matches(rawPassword, storedHash.substring(PREFIX_BCRYPT.length()));
    }
    if (storedHash.startsWith(PREFIX_SHA256)) {
      String expected = storedHash.substring(PREFIX_SHA256.length());
      String actual = sha256Hex(rawPassword);
      return constantTimeEquals(expected, actual);
    }
    // 兼容无前缀的历史 BCrypt
    if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
      return bcrypt.matches(rawPassword, storedHash);
    }
    return false;
  }

  /** 新密码统一 BCrypt */
  public String hash(String rawPassword) {
    return PREFIX_BCRYPT + bcrypt.encode(rawPassword);
  }

  /** @deprecated 仅兼容旧种子；新代码请用 {@link #hash} */
  public String hashSha256(String rawPassword) {
    return PREFIX_SHA256 + sha256Hex(rawPassword);
  }

  private String sha256Hex(String rawPassword) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] digest = md.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (Exception e) {
      throw new IllegalStateException("密码哈希失败", e);
    }
  }

  private boolean constantTimeEquals(String a, String b) {
    if (a.length() != b.length()) return false;
    int result = 0;
    for (int i = 0; i < a.length(); i++) {
      result |= a.charAt(i) ^ b.charAt(i);
    }
    return result == 0;
  }
}
