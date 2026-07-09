-- 考勤卡：每员工仅一条版本链（按生效日新增版本换新卡）
-- V39 已添加 (employee_id, card_no, effective_start_date) 唯一约束；此处调整为 (employee_id, effective_start_date)

ALTER TABLE employee_attendance_card
  DROP INDEX uk_eac_employee_card_start;

ALTER TABLE employee_attendance_card
  ADD UNIQUE KEY uk_eac_employee_start (employee_id, effective_start_date);

