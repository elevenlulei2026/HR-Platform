package com.hrplatform.platform.web.health;

import com.hrplatform.platform.web.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

  @Value("${spring.application.name:hr-platform}")
  private String serviceName;

  @Value("${app.version:dev}")
  private String version;

  @GetMapping("/health")
  public ApiResponse<Map<String, Object>> health() {
    return ApiResponse.ok(
        Map.of(
            "status", "ok",
            "service", serviceName,
            "version", version,
            "serverTime", OffsetDateTime.now().toString()
        )
    );
  }
}

