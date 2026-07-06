package com.hrplatform.platform.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class FieldCryptoService {
  private static final String PREFIX = "ENC:";
  private static final int GCM_IV_LENGTH = 12;
  private static final int GCM_TAG_LENGTH = 128;

  private final byte[] keyBytes;
  private final SecureRandom secureRandom = new SecureRandom();

  public FieldCryptoService(@Value("${hr.crypto.key}") String keyBase64) {
    byte[] decoded = Base64.getDecoder().decode(keyBase64);
    if (decoded.length != 32) {
      throw new IllegalStateException("HR_CRYPTO_KEY 必须为 32 字节 Base64 编码");
    }
    this.keyBytes = decoded;
  }

  public String encrypt(String plain) {
    if (plain == null || plain.isBlank()) return plain;
    try {
      byte[] iv = new byte[GCM_IV_LENGTH];
      secureRandom.nextBytes(iv);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
      byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
      ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
      buffer.put(iv);
      buffer.put(encrypted);
      return PREFIX + Base64.getEncoder().encodeToString(buffer.array());
    } catch (Exception e) {
      throw new IllegalStateException("字段加密失败", e);
    }
  }

  public String decrypt(String stored) {
    if (stored == null || stored.isBlank()) return stored;
    if (!stored.startsWith(PREFIX)) return stored;
    try {
      byte[] payload = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
      ByteBuffer buffer = ByteBuffer.wrap(payload);
      byte[] iv = new byte[GCM_IV_LENGTH];
      buffer.get(iv);
      byte[] encrypted = new byte[buffer.remaining()];
      buffer.get(encrypted);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
      return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new IllegalStateException("字段解密失败", e);
    }
  }

  public String maskMobile(String plain) {
    if (plain == null || plain.isBlank()) return "";
    String v = plain.trim();
    if (v.length() < 7) return "***";
    return v.substring(0, 3) + "****" + v.substring(v.length() - 4);
  }

  public String maskIdNumber(String plain) {
    if (plain == null || plain.isBlank()) return "";
    String v = plain.trim();
    if (v.length() <= 4) return "****";
    return v.substring(0, 2) + "****" + v.substring(v.length() - 2);
  }

  public String maskAccountNo(String plain) {
    if (plain == null || plain.isBlank()) return "";
    String v = plain.trim();
    if (v.length() <= 8) return "****";
    return v.substring(0, 4) + "****" + v.substring(v.length() - 4);
  }

  public String maskGeneric(String plain) {
    if (plain == null || plain.isBlank()) return "";
    String v = plain.trim();
    if (v.length() <= 4) return "****";
    return v.substring(0, 2) + "****" + v.substring(v.length() - 2);
  }
}
