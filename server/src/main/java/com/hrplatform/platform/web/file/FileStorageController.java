package com.hrplatform.platform.web.file;

import com.hrplatform.platform.file.LocalFileStorageService;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/files")
public class FileStorageController {
  private final LocalFileStorageService fileStorageService;
  private final RbacService rbacService;

  public FileStorageController(LocalFileStorageService fileStorageService, RbacService rbacService) {
    this.fileStorageService = fileStorageService;
    this.rbacService = rbacService;
  }

  @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<Map<String, Object>> upload(
      @RequestParam("file") MultipartFile file,
      @RequestParam(defaultValue = "employee-attachment") String category
  ) {
    rbacService.requirePermission("employee:edit");
    LocalFileStorageService.StoredFile stored = fileStorageService.store(file, category);
    Map<String, Object> dto = new HashMap<>();
    dto.put("storageKey", stored.storageKey());
    dto.put("originalFilename", stored.originalFilename());
    dto.put("size", stored.size());
    dto.put("contentType", stored.contentType() == null ? "" : stored.contentType());
    return ApiResponse.ok(dto);
  }
}
