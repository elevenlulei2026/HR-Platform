-- 岗位生效日期版本化：支持多版本与 effective_end_date

ALTER TABLE position
  ADD COLUMN effective_end_date DATE NULL AFTER effective_start_date;

ALTER TABLE position DROP INDEX uk_position_code;

ALTER TABLE position
  ADD UNIQUE KEY uk_position_code_effective (code, effective_start_date),
  ADD KEY idx_position_effective_end (effective_end_date);
