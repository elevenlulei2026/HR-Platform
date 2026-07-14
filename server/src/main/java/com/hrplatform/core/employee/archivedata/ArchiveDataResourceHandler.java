package com.hrplatform.core.employee.archivedata;

import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ExportFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ImportResult;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.ListFilter;
import com.hrplatform.core.employee.archivedata.ArchiveDataModels.PageResult;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * 单个档案批管资源的实现契约。
 * <p>
 * <b>参考实现</b>：{@link IdDocumentArchiveDataHandler}（证件信息）。
 * 新增模块请复制该类套路：写操作委托 {@code EmployeeArchiveService}，导出写字典名称。
 */
public interface ArchiveDataResourceHandler {
  /** 与菜单 path / {@code EmployeeArchiveResourcePath} 一致，如 {@code id-documents} */
  String path();

  PageResult<Map<String, Object>> page(ListFilter filter);

  Map<String, Object> create(Map<String, Object> body, boolean revealSensitive);

  Map<String, Object> update(long id, Map<String, Object> body, boolean revealSensitive);

  Map<String, Object> delete(long id);

  byte[] buildImportTemplate();

  ImportResult importExcel(MultipartFile file);

  byte[] exportExcel(ExportFilter filter);
}
