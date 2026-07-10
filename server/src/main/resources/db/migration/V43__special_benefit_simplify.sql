-- 特殊福利精简为：是否有特殊福利 + 截止日期

ALTER TABLE employee_special_benefit
  DROP INDEX idx_esb_type,
  DROP INDEX idx_esb_effective;

ALTER TABLE employee_special_benefit
  ADD COLUMN has_special_benefit VARCHAR(8) NULL COMMENT '是否有特殊福利 YES/NO' AFTER employee_id;

-- 历史行视为「有特殊福利」
UPDATE employee_special_benefit
SET has_special_benefit = 'YES'
WHERE has_special_benefit IS NULL;

ALTER TABLE employee_special_benefit
  MODIFY COLUMN has_special_benefit VARCHAR(8) NOT NULL DEFAULT 'NO' COMMENT '是否有特殊福利 YES/NO';

ALTER TABLE employee_special_benefit
  CHANGE COLUMN effective_end_date end_date DATE NULL COMMENT '特殊福利截止日期';

ALTER TABLE employee_special_benefit
  DROP COLUMN benefit_type,
  DROP COLUMN benefit_name,
  DROP COLUMN amount,
  DROP COLUMN currency_code,
  DROP COLUMN effective_start_date,
  DROP COLUMN remark;

ALTER TABLE employee_special_benefit
  ADD KEY idx_esb_has_benefit (has_special_benefit),
  ADD KEY idx_esb_end_date (end_date);
