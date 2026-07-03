package com.hrplatform.platform.web.code;

import com.hrplatform.platform.code.CodeGeneratorService;
import com.hrplatform.platform.code.CodeRuleEntity;
import com.hrplatform.platform.code.CodeRuleService;
import com.hrplatform.platform.rbac.RbacService;
import com.hrplatform.platform.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class CodeRuleController {
  private final CodeRuleService codeRuleService;
  private final CodeGeneratorService codeGeneratorService;
  private final RbacService rbacService;

  public CodeRuleController(
      CodeRuleService codeRuleService,
      CodeGeneratorService codeGeneratorService,
      RbacService rbacService
  ) {
    this.codeRuleService = codeRuleService;
    this.codeGeneratorService = codeGeneratorService;
    this.rbacService = rbacService;
  }

  @GetMapping("/code-rules")
  public ApiResponse<Map<String, Object>> list(
      @RequestParam(required = false) String keyword,
      @RequestParam @Min(value = 1, message = "page 必须 >= 1") long page,
      @RequestParam @Min(value = 1, message = "pageSize 必须 >= 1") @Max(value = 200, message = "pageSize 不能超过 200") long pageSize
  ) {
    requireDictManage();
    CodeRuleService.PageResult<CodeRuleEntity> p = codeRuleService.page(new CodeRuleService.Query(keyword, page, pageSize));
    Map<String, Object> pageResult = new HashMap<>();
    pageResult.put("items", p.records().stream().map(this::toDto).toList());
    pageResult.put("total", p.total());
    pageResult.put("page", page);
    pageResult.put("pageSize", pageSize);
    return ApiResponse.ok(pageResult);
  }

  @PostMapping("/code-rules")
  public ApiResponse<Map<String, Object>> create(@Valid @RequestBody CreateRequest req) {
    requireDictManage();
    CodeRuleEntity e = new CodeRuleEntity();
    e.setCode(req.code());
    e.setName(req.name());
    e.setPattern(req.pattern());
    e.setSeqReset(req.seqReset());
    e.setSeqStart(req.seqStart());
    e.setSeqLength(req.seqLength());
    CodeRuleEntity created = codeRuleService.create(e);
    return ApiResponse.ok(toDto(created));
  }

  @PutMapping("/code-rules/{id}")
  public ApiResponse<Map<String, Object>> update(@PathVariable("id") long id, @Valid @RequestBody UpdateRequest req) {
    requireDictManage();
    CodeRuleEntity patch = new CodeRuleEntity();
    patch.setName(req.name());
    patch.setPattern(req.pattern());
    patch.setSeqReset(req.seqReset());
    patch.setSeqStart(req.seqStart());
    patch.setSeqLength(req.seqLength());
    CodeRuleEntity updated = codeRuleService.update(id, patch);
    return ApiResponse.ok(toDto(updated));
  }

  @DeleteMapping("/code-rules/{id}")
  public ApiResponse<Map<String, Object>> delete(@PathVariable("id") long id) {
    requireDictManage();
    codeRuleService.delete(id);
    return ApiResponse.ok(Map.of("id", String.valueOf(id)));
  }

  @PostMapping("/codes/generate")
  public ApiResponse<Map<String, Object>> generate(@Valid @RequestBody GenerateRequest req) {
    requireDictManage();
    CodeGeneratorService.GeneratedCode gen = codeGeneratorService.generate(req.ruleCode());
    return ApiResponse.ok(Map.of("ruleCode", gen.ruleCode(), "code", gen.code()));
  }

  private void requireDictManage() {
    rbacService.requirePermission("dict:manage");
  }

  private Map<String, Object> toDto(CodeRuleEntity e) {
    Map<String, Object> dto = new HashMap<>();
    dto.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
    dto.put("code", e.getCode());
    dto.put("name", e.getName());
    dto.put("pattern", e.getPattern());
    dto.put("seqReset", e.getSeqReset());
    dto.put("seqStart", e.getSeqStart());
    dto.put("seqLength", e.getSeqLength());
    dto.put("status", e.getStatus() == null ? "ACTIVE" : e.getStatus());
    dto.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
    return dto;
  }

  public record CreateRequest(
      @NotBlank(message = "code 不能为空") String code,
      @NotBlank(message = "name 不能为空") String name,
      @NotBlank(message = "pattern 不能为空") String pattern,
      @NotBlank(message = "seqReset 不能为空") String seqReset,
      Integer seqStart,
      Integer seqLength
  ) {}

  public record UpdateRequest(
      String name,
      String pattern,
      String seqReset,
      Integer seqStart,
      Integer seqLength
  ) {}

  public record GenerateRequest(
      @NotBlank(message = "ruleCode 不能为空") String ruleCode
  ) {}
}

