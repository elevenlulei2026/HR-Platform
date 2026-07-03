-- 组织：部门类型（引用字典 DEPARTMENT_TYPE）

ALTER TABLE organization
  ADD COLUMN department_type VARCHAR(64) NULL AFTER org_type,
  ADD KEY idx_org_department_type (department_type);
