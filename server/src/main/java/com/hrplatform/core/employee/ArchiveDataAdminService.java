package com.hrplatform.core.employee;

import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ExportFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ImportResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ListFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.PageResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.RowError;
import com.hrplatform.core.employee.archivedata.ArchiveDataResourceHandler;
import com.hrplatform.core.employee.archivedata.ArchiveDataSupport;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 档案批管门面：按 resource 分发到 {@link ArchiveDataResourceHandler}。
 * <p>
 * 新增模块：实现 Handler（参考 {@link com.hrplatform.core.employee.archivedata.IdDocumentArchiveDataHandler}），
 * 并在 {@link ArchiveDataResourceRegistry} 将该 path 设为 {@code supported=true}。
 */
@Service
public class ArchiveDataAdminService {
  private final Map<String, ArchiveDataResourceHandler> handlers;

  public ArchiveDataAdminService(List<ArchiveDataResourceHandler> handlerList) {
    this.handlers = handlerList.stream()
        .collect(Collectors.toMap(ArchiveDataResourceHandler::path, Function.identity(), (a, b) -> a));
  }

  public List<Map<String, Object>> listResources() {
    List<Map<String, Object>> out = new ArrayList<>();
    for (ArchiveDataResourceRegistry.ResourceMeta meta : ArchiveDataResourceRegistry.all()) {
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("path", meta.path());
      row.put("title", meta.title());
      row.put("section", meta.section());
      row.put("supported", meta.supported());
      row.put("description", meta.description());
      out.add(row);
    }
    return out;
  }

  public PageResult<Map<String, Object>> page(
      String resource,
      String keyword,
      String employeeNo,
      Long organizationId,
      boolean revealSensitive,
      long page,
      long pageSize
  ) {
    return handler(resource).page(new ListFilter(
        keyword, employeeNo, organizationId, revealSensitive, page, pageSize
    ));
  }

  public Map<String, Object> create(String resource, Map<String, Object> body, boolean revealSensitive) {
    return handler(resource).create(body, revealSensitive);
  }

  public Map<String, Object> update(String resource, long id, Map<String, Object> body, boolean revealSensitive) {
    return handler(resource).update(id, body, revealSensitive);
  }

  public Map<String, Object> delete(String resource, long id) {
    return handler(resource).delete(id);
  }

  public byte[] buildImportTemplate(String resource) {
    return handler(resource).buildImportTemplate();
  }

  public ImportResult importExcel(String resource, MultipartFile file) {
    return handler(resource).importExcel(file);
  }

  public byte[] buildErrorReport(List<RowError> errors) {
    return ArchiveDataSupport.buildErrorReportExcel(errors);
  }

  public byte[] exportExcel(
      String resource,
      String keyword,
      String employeeNo,
      Long organizationId,
      boolean revealSensitive
  ) {
    return handler(resource).exportExcel(new ExportFilter(
        keyword, employeeNo, organizationId, revealSensitive
    ));
  }

  private ArchiveDataResourceHandler handler(String resource) {
    ArchiveDataResourceRegistry.requireSupported(resource);
    ArchiveDataResourceHandler h = handlers.get(resource);
    if (h == null) {
      throw new IllegalArgumentException("批管 Handler 未注册: " + resource + "（请实现 ArchiveDataResourceHandler）");
    }
    return h;
  }
}
