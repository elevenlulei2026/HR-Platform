package com.hrplatform.platform;

import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.hrplatform")
@MapperScan(value = "com.hrplatform", annotationClass = Mapper.class)
public class HrPlatformApplication {

  public static void main(String[] args) {
    SpringApplication.run(HrPlatformApplication.class, args);
  }
}

