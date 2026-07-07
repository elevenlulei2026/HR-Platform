package com.hrplatform.platform.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class LocalFileStorageService {
  private static final int MAX_FILENAME_CHARS = 120;
  private static final int MAX_STORAGE_KEY_CHARS = 500;

  private final Path storageRoot;

  public LocalFileStorageService(@Value("${hr.storage.path:./data/files}") String storagePath) {
    this.storageRoot = Path.of(storagePath).toAbsolutePath().normalize();
    try {
      Files.createDirectories(storageRoot);
    } catch (IOException e) {
      throw new IllegalStateException("无法创建文件存储目录: " + storageRoot, e);
    }
  }

  public StoredFile store(MultipartFile file, String category) {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("请上传文件");
    }
    String original = sanitizeFilename(file.getOriginalFilename());
    String storageKey = buildStorageKey(category, original);
    Path target = resolve(storageKey);
    try {
      Files.createDirectories(target.getParent());
      try (InputStream in = file.getInputStream()) {
        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
      }
      return new StoredFile(storageKey, original, file.getSize(), file.getContentType());
    } catch (IOException e) {
      throw new IllegalStateException("文件保存失败", e);
    }
  }

  public Resource load(String storageKey) {
    Path path = resolve(storageKey);
    if (!Files.exists(path) || !Files.isRegularFile(path)) {
      throw new IllegalArgumentException("文件不存在");
    }
    try {
      return new InputStreamResource(Files.newInputStream(path));
    } catch (IOException e) {
      throw new IllegalStateException("文件读取失败", e);
    }
  }

  public String contentType(String storageKey) {
    try {
      Path path = resolve(storageKey);
      String probed = Files.probeContentType(path);
      return probed == null ? "application/octet-stream" : probed;
    } catch (IOException e) {
      return "application/octet-stream";
    }
  }

  private Path resolve(String storageKey) {
    if (storageKey == null || storageKey.isBlank()) {
      throw new IllegalArgumentException("storageKey 无效");
    }
    Path resolved = storageRoot.resolve(storageKey).normalize();
    if (!resolved.startsWith(storageRoot)) {
      throw new IllegalArgumentException("非法 storageKey");
    }
    return resolved;
  }

  private String sanitizeFilename(String name) {
    if (name == null || name.isBlank()) return "file";
    String base = Path.of(name).getFileName().toString();
    String cleaned = base.replaceAll("[^a-zA-Z0-9._\\-()\\u4e00-\\u9fa5]", "_");
    if (cleaned.length() <= MAX_FILENAME_CHARS) return cleaned;
    int dot = cleaned.lastIndexOf('.');
    if (dot > 0 && dot < cleaned.length() - 1) {
      String ext = cleaned.substring(dot);
      int keep = Math.max(1, MAX_FILENAME_CHARS - ext.length());
      return cleaned.substring(0, keep) + ext;
    }
    return cleaned.substring(0, MAX_FILENAME_CHARS);
  }

  private String buildStorageKey(String category, String original) {
    String prefix = category + "/" + LocalDate.now() + "/" + UUID.randomUUID() + "_";
    String key = prefix + original;
    if (key.length() <= MAX_STORAGE_KEY_CHARS) return key;
    return prefix + original.substring(0, Math.max(1, MAX_STORAGE_KEY_CHARS - prefix.length()));
  }

  public record StoredFile(String storageKey, String originalFilename, long size, String contentType) {}
}
