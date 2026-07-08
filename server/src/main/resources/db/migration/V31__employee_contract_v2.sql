-- 员工档案：合同信息字段优化（生效日期 + 合同类别父子联动 + 签订次数）
-- 约定：
-- - 生效日期采用 effective_start_date / effective_end_date（对齐档案其他子表）
-- - 合同类别使用父子值配置 CONTRACT_CATEGORY：一级=parent_code='' 的 code，二级=parent_code=一级 code 的 code
-- - 签订次数为运行时计算字段，不落库

ALTER TABLE employee_contract
  ADD COLUMN effective_start_date DATE NULL COMMENT '生效开始日期（档案记录）';

ALTER TABLE employee_contract
  ADD COLUMN effective_end_date DATE NULL COMMENT '生效结束日期（档案记录）';

ALTER TABLE employee_contract
  ADD COLUMN contract_category VARCHAR(64) NULL COMMENT '合同类别（父子值：一级 code）';

ALTER TABLE employee_contract
  ADD COLUMN contract_category_desc VARCHAR(64) NULL COMMENT '合同类别描述（父子值：二级 code）';

-- 兼容旧数据：若历史只有 effective_date，则写入 effective_start_date（不覆盖用户后续维护）
UPDATE employee_contract
SET effective_start_date = effective_date
WHERE effective_start_date IS NULL
  AND effective_date IS NOT NULL;

ALTER TABLE employee_contract
  ADD KEY idx_ec_effective (effective_start_date, effective_end_date);

