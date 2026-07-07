-- 附件 storage_key 可能含 UUID + 长文件名，扩展至 512
ALTER TABLE employee_attachment
  MODIFY COLUMN storage_key VARCHAR(512) NULL;
