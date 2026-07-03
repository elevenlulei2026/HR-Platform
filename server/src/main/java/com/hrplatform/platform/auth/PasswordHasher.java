package com.hrplatform.platform.auth;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
public class PasswordHasher {
  private static final String PREFIX_SHA256 = "sha256:";

  public boolean matches(String rawPassword, String storedHash) {
    if (storedHash == null || storedHash.isBlank()) return false;
    if (storedHash.startsWith(PREFIX_SHA256)) {
      String expected = storedHash.substring(PREFIX_SHA256.length());
      String actual = sha256Hex(rawPassword);
      return constantTimeEquals(expected, actual);
    }
    return false;
  }

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

