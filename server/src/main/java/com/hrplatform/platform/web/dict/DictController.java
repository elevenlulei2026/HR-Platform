package com.hrplatform.platform.web.dict;

import com.hrplatform.platform.dict.DictImportService;
import com.hrplatform.platform.dict.DictItemEntity;
import com.hrplatform.platform.dict.DictService;
import com.hrplatform.platform.dict.DictTypeEntity;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class DictController {
  private final DictService dictService;
  private final DictImportService dictImportService;
  private final RbacService rbacService;

  public DictController(DictService dictService, DictImportService dictImportService, RbacService rbacService) {
    this.dictService = dictService;
    this.dictImportService = dictImportService;
    this.rbacService = rbacService;
  }

  @GetMapping("/dict-types")
  public ApiResponse<Map<String, Object>> listTypes(
      @RequestParam(required = false) String keyword,
      @RequestParam @Min(value = 1, message = "page 必须 >= 1") long page,
      @RequestParam @Min(value = 1, message = "pageSize 必须 >= 1") @Max(value = 200, message = "pageSize 不能超过 200") long pageSize
  ) {
    requireDictManage();
    DictService.PageResult<DictTypeEntity> p = dictService.pageTypes(new DictService.Query(keyword, page, pageSize));
    Map<String, Object> pageResult = new HashMap<>();
    pageResult.put("items", p.records().stream().map(this::toTypeDto).toList());
    pageResult.put("total", p.total());
    pageResult.put("page", page);
    pageResult.put("pageSize", pageSize);
    return ApiResponse.ok(pageResult);
  }

  @PostMapping("/dict-types")
  public ApiResponse<Map<String, Object>> createType(@Valid @RequestBody DictTypeCreateRequest req) {
    requireDictManage();
    DictTypeEntity entity = new DictTypeEntity();
    entity.setCode(req.code());
    entity.setName(req.name());
    entity.setDescription(req.description());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    DictTypeEntity created = dictService.createType(entity);
    return ApiResponse.ok(toTypeDto(created));
  }

  @GetMapping("/dict-types/{id}")
  public ApiResponse<Map<String, Object>> getType(@PathVariable("id") long id) {
    requireDictManage();
    DictTypeEntity e = dictService.requireType(id);
    return ApiResponse.ok(toTypeDto(e));
  }

  @PutMapping("/dict-types/{id}")
  public ApiResponse<Map<String, Object>> updateType(
      @PathVariable("id") long id,
      @Valid @RequestBody DictTypeUpdateRequest req
  ) {
    requireDictManage();
    DictTypeEntity patch = new DictTypeEntity();
    patch.setName(req.name());
    patch.setDescription(req.description());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    DictTypeEntity updated = dictService.updateType(id, patch);
    return ApiResponse.ok(toTypeDto(updated));
  }

  @DeleteMapping("/dict-types/{id}")
  public ApiResponse<Map<String, Object>> deleteType(@PathVariable("id") long id) {
    requireDictManage();
    dictService.deleteType(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  @GetMapping("/dict-types/{typeCode}/items")
  public ApiResponse<List<Map<String, Object>>> listItems(@PathVariable("typeCode") String typeCode) {
    requireDictManage();
    List<DictItemEntity> items = dictService.listAllItemsByTypeCode(typeCode);
    return ApiResponse.ok(items.stream().map(this::toItemDto).toList());
  }

  @PostMapping("/dict-items")
  public ApiResponse<Map<String, Object>> createItem(@Valid @RequestBody DictItemCreateRequest req) {
    requireDictManage();
    DictItemEntity entity = new DictItemEntity();
    entity.setTypeCode(req.typeCode());
    entity.setValue(req.value());
    entity.setLabel(req.label());
    entity.setStatus(req.status());
    entity.setSort(req.sort());
    entity.setExtJson(req.extJsonJson());
    DictItemEntity created = dictService.createItem(entity);
    return ApiResponse.ok(toItemDto(created));
  }

  @PutMapping("/dict-items/{id}")
  public ApiResponse<Map<String, Object>> updateItem(
      @PathVariable("id") long id,
      @Valid @RequestBody DictItemUpdateRequest req
  ) {
    requireDictManage();
    DictItemEntity patch = new DictItemEntity();
    patch.setValue(req.value());
    patch.setLabel(req.label());
    patch.setStatus(req.status());
    patch.setSort(req.sort());
    patch.setExtJson(req.extJsonJson());
    DictItemEntity updated = dictService.updateItem(id, patch);
    return ApiResponse.ok(toItemDto(updated));
  }

  @DeleteMapping("/dict-items/{id}")
  public ApiResponse<Map<String, Object>> deleteItem(@PathVariable("id") long id) {
    requireDictManage();
    dictService.deleteItem(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  @GetMapping("/dict/import-template")
  public ResponseEntity<byte[]> downloadImportTemplate() {
    requireDictManage();
    byte[] bytes = dictImportService.buildTemplate();
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=dict-import-template.xlsx")
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(bytes);
  }

  @PostMapping(value = "/dict/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<Map<String, Object>> importDict(@RequestParam("file") MultipartFile file) {
    requireDictManage();
    DictImportService.ImportResult r = dictImportService.importExcel(file);
    Map<String, Object> dto = new HashMap<>();
    dto.put("totalRows", r.totalRows());
    dto.put("successCount", r.successCount());
    dto.put("failureCount", r.failureCount());
    dto.put("errors", r.errors().stream().map(e -> {
      Map<String, Object> err = new HashMap<>();
      err.put("rowNumber", e.rowNumber());
      err.put("field", e.field() == null ? "" : e.field());
      err.put("message", e.message());
      return err;
    }).toList());
    return ApiResponse.ok(dto);
  }

  @PostMapping("/dict/import-error-report")
  public ResponseEntity<byte[]> importErrorReport(@Valid @RequestBody ImportErrorReportRequest req) {
    requireDictManage();
    List<DictImportService.RowError> errors = req.errors().stream()
        .map(e -> new DictImportService.RowError(e.rowNumber(), e.field(), e.message()))
        .toList();
    byte[] bytes = dictImportService.buildErrorReport(errors);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=dict-import-errors.xlsx")
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(bytes);
  }

  private void requireDictManage() {
    rbacService.requirePermission("dict:manage");
  }

  private Map<String, Object> toTypeDto(DictTypeEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("description", e.getDescription());
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  private Map<String, Object> toItemDto(DictItemEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("typeCode", e.getTypeCode());
    dto.put("value", e.getValue());
    dto.put("label", e.getLabel());
    dto.put("status", e.getStatus());
    dto.put("sort", e.getSort() == null ? 0 : e.getSort());
    dto.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    dto.put("extJson", com.hrplatform.platform.auth.Jsons.readMap(e.getExtJson()));
    return dto;
  }

  public record DictTypeCreateRequest(
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      String description,
      String status,
      Integer sort
  ) {}

  public record DictTypeUpdateRequest(
      String name,
      String description,
      String status,
      Integer sort
  ) {}

  public record DictItemCreateRequest(
      @NotBlank(message = "typeCode 不能为空") String typeCode,
      @NotBlank(message = "value 不能为空") String value,
      @NotBlank(message = "label 不能为空") String label,
      String status,
      Integer sort,
      Map<String, Object> extJson
  ) {
    public String extJsonJson() {
      return extJson == null ? null : com.hrplatform.platform.auth.Jsons.write(extJson);
    }
  }

  public record DictItemUpdateRequest(
      String value,
      String label,
      String status,
      Integer sort,
      Map<String, Object> extJson
  ) {
    public String extJsonJson() {
      return extJson == null ? null : com.hrplatform.platform.auth.Jsons.write(extJson);
    }
  }

  public record ImportErrorReportRequest(
      @NotNull(message = "errors 不能为空") List<ImportRowErrorRequest> errors
  ) {}

  public record ImportRowErrorRequest(
      int rowNumber,
      String field,
      String message
  ) {}
}

