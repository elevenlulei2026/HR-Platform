-- 员工档案：工伤信息（多行）
CREATE TABLE IF NOT EXISTS employee_work_injury (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  accident_date DATE NULL COMMENT '事故发生日期',
  accident_reason VARCHAR(2000) NULL COMMENT '事故原因',
  witness VARCHAR(128) NULL COMMENT '见证人',
  recognition_date DATE NULL COMMENT '工伤认定日期',
  disability_assessment_date DATE NULL COMMENT '伤残鉴定日期',
  is_recognized VARCHAR(8) NULL COMMENT '是否认定为工伤 YES/NO',
  participated_labor_assessment VARCHAR(8) NULL COMMENT '是否参加劳动力鉴定 YES/NO',
  labor_assessment_level VARCHAR(2000) NULL COMMENT '劳动力鉴定级别',
  remark VARCHAR(2000) NULL COMMENT '备注',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_ewi_employee_id (employee_id),
  KEY idx_ewi_accident_date (accident_date),
  KEY idx_ewi_is_recognized (is_recognized),
  CONSTRAINT fk_ewi_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
