-- 员工档案：协议信息字段优化（生效日期 + 协议编号 + 操作类型 + 协议类别）
-- 约定：
-- - 生效日期采用 effective_start_date / effective_end_date（对齐档案其他子表）
-- - 操作类型使用数据字典 AGREEMENT_OPERATION_TYPE（10/20/30/40）
-- - 协议类别使用数据字典 AGREEMENT_CATEGORY（10..90）

ALTER TABLE employee_agreement
  ADD COLUMN effective_start_date DATE NULL COMMENT '生效开始日期（档案记录）';

ALTER TABLE employee_agreement
  ADD COLUMN effective_end_date DATE NULL COMMENT '生效结束日期（档案记录）';

ALTER TABLE employee_agreement
  ADD COLUMN agreement_code VARCHAR(64) NULL COMMENT '协议编号（手填）';

ALTER TABLE employee_agreement
  ADD COLUMN operation_type VARCHAR(64) NULL COMMENT '操作类型（数据字典）';

ALTER TABLE employee_agreement
  ADD COLUMN agreement_category VARCHAR(64) NULL COMMENT '协议类别（数据字典）';

-- 兼容旧数据：优先用 start_date 作为生效开始日（不覆盖用户后续维护）
UPDATE employee_agreement
SET effective_start_date = start_date
WHERE effective_start_date IS NULL
  AND start_date IS NOT NULL;

-- 兼容旧数据：NDA -> 保密协议（AGREEMENT_CATEGORY=20）
UPDATE employee_agreement
SET agreement_category = '20'
WHERE agreement_category IS NULL
  AND agreement_type IS NOT NULL
  AND agreement_type = 'NDA';

ALTER TABLE employee_agreement
  ADD KEY idx_ea_effective (effective_start_date, effective_end_date);

