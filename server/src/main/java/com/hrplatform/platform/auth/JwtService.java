package com.hrplatform.platform.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Set;
import java.util.Map;

@Service
public class JwtService {
  private final ObjectMapper objectMapper;
  private final byte[] secretBytes;
  private final long ttlSeconds;

  public JwtService(
      ObjectMapper objectMapper,
      @Value("${app.jwt.secret:dev-secret}") String secret,
      @Value("${app.jwt.ttl-seconds:86400}") long ttlSeconds
  ) {
    this.objectMapper = objectMapper;
    this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
    this.ttlSeconds = ttlSeconds;
  }

  public SignedToken issue(AuthUser user) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(ttlSeconds);
    String token = signToken(user, exp);
    return new SignedToken(token, exp);
  }

  public AuthUser verify(String token) {
    String[] parts = token.split("\\.");
    if (parts.length != 3) throw new UnauthorizedException("token 格式错误");

    String headerB64 = parts[0];
    String payloadB64 = parts[1];
    String signatureB64 = parts[2];

    String expectedSig = hmacSha256Base64Url(headerB64 + "." + payloadB64);
    if (!constantTimeEquals(expectedSig, signatureB64)) {
      throw new UnauthorizedException("token 签名无效");
    }

    Map<?, ?> payload = readJsonMap(base64UrlDecodeToString(payloadB64));
    Object sub = payload.get("sub");
    Object username = payload.get("username");
    Object exp = payload.get("exp");

    if (!(sub instanceof String) || ((String) sub).isBlank()) {
      throw new UnauthorizedException("token 无 sub");
    }
    if (!(username instanceof String) || ((String) username).isBlank()) {
      throw new UnauthorizedException("token 无 username");
    }
    if (!(exp instanceof Number)) {
      throw new UnauthorizedException("token 无 exp");
    }

    long expEpoch = ((Number) exp).longValue();
    if (Instant.now().getEpochSecond() >= expEpoch) {
      throw new UnauthorizedException("登录已过期");
    }

    Long userId;
    try {
      userId = Long.parseLong((String) sub);
    } catch (NumberFormatException e) {
      throw new UnauthorizedException("token sub 非法");
    }
    return new AuthUser(userId, (String) username, Set.of(), Set.of(), null);
  }

  private String signToken(AuthUser user, Instant exp) {
    String headerJson = writeJson(Map.of("alg", "HS256", "typ", "JWT"));
    String payloadJson = writeJson(
        Map.of(
            "sub", String.valueOf(user.id()),
            "username", user.username(),
            "exp", exp.getEpochSecond()
        )
    );

    String headerB64 = base64UrlEncode(headerJson);
    String payloadB64 = base64UrlEncode(payloadJson);
    String sigB64 = hmacSha256Base64Url(headerB64 + "." + payloadB64);
    return headerB64 + "." + payloadB64 + "." + sigB64;
  }

  private String hmacSha256Base64Url(String input) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
      byte[] sig = mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
    } catch (Exception e) {
      throw new IllegalStateException("JWT 签名失败", e);
    }
  }

  private String base64UrlEncode(String s) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(s.getBytes(StandardCharsets.UTF_8));
  }

  private String base64UrlDecodeToString(String b64) {
    byte[] bytes = Base64.getUrlDecoder().decode(b64);
    return new String(bytes, StandardCharsets.UTF_8);
  }

  private String writeJson(Map<String, Object> map) {
    try {
      return objectMapper.writeValueAsString(map);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("JWT 序列化失败", e);
    }
  }

  @SuppressWarnings("unchecked")
  private Map<?, ?> readJsonMap(String json) {
    try {
      return objectMapper.readValue(json, Map.class);
    } catch (JsonProcessingException e) {
      throw new UnauthorizedException("token payload 解析失败");
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

  public record SignedToken(String token, Instant expiresAt) {}
}

