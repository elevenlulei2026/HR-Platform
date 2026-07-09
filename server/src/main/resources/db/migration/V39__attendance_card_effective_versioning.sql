-- 考勤卡：删除设备编号/考勤地点，强化生效日期版本化
UPDATE employee_attendance_card
SET effective_start_date = CURDATE()
WHERE effective_start_date IS NULL;

ALTER TABLE employee_attendance_card
  DROP COLUMN device_id,
  DROP COLUMN work_location;

ALTER TABLE employee_attendance_card
  MODIFY effective_start_date DATE NOT NULL COMMENT '生效开始日';

ALTER TABLE employee_attendance_card
  ADD UNIQUE KEY uk_eac_employee_card_start (employee_id, card_no, effective_start_date);
