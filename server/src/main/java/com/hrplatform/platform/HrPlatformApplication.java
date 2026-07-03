package com.hrplatform.platform;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.hrplatform")
@MapperScan("com.hrplatform")
public class HrPlatformApplication {

  public static void main(String[] args) {
    SpringApplication.run(HrPlatformApplication.class, args);
  }
}

