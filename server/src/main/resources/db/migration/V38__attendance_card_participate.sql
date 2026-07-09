ALTER TABLE employee_attendance_card
  ADD COLUMN participate_in_attendance VARCHAR(8) NOT NULL DEFAULT 'YES' COMMENT '是否参与考勤 YES/NO';
