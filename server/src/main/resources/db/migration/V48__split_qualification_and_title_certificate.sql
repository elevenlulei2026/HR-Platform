-- 资格证书 / 职称证书拆分：
-- 原 employee_qualification（职称字段）迁移至 employee_title_certificate，
-- employee_qualification 改为资格证书（技能类）字段结构。

CREATE TABLE IF NOT EXISTS employee_title_certificate (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  title_name VARCHAR(128) NULL,
  title_level VARCHAR(64) NULL,
  approval_date DATE NULL,
  expiry_date DATE NULL,
  certificate_no VARCHAR(64) NULL,
  issuing_org VARCHAR(128) NULL,
  remark VARCHAR(512) NULL,
  attachment_ids VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_etc_employee_id (employee_id),
  KEY idx_etc_certificate_no (certificate_no),
  KEY idx_etc_expiry_date (expiry_date),
  CONSTRAINT fk_etc_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO employee_title_certificate (
  employee_id, title_name, title_level, approval_date, expiry_date,
  certificate_no, issuing_org, attachment_ids,
  created_at, updated_at, created_by, updated_by
)
SELECT
  employee_id, title_name, title_level, approval_date, expiry_date,
  certificate_no, issuing_org,
  CASE WHEN attachment_id IS NOT NULL THEN CAST(attachment_id AS CHAR) ELSE NULL END,
  created_at, updated_at, created_by, updated_by
FROM employee_qualification;

DELETE FROM employee_qualification;

ALTER TABLE employee_qualification
  DROP COLUMN title_name,
  DROP COLUMN title_level,
  DROP COLUMN approval_date,
  DROP COLUMN attachment_id,
  ADD COLUMN skill_type VARCHAR(64) NULL AFTER employee_id,
  ADD COLUMN first_issue_date DATE NULL AFTER skill_type,
  ADD COLUMN review_date DATE NULL AFTER expiry_date,
  ADD COLUMN certificate_name VARCHAR(128) NULL AFTER review_date,
  ADD COLUMN handler_name VARCHAR(64) NULL AFTER certificate_no,
  ADD COLUMN remark VARCHAR(512) NULL AFTER issuing_org,
  ADD COLUMN attachment_ids VARCHAR(512) NULL AFTER remark;

ALTER TABLE employee_qualification
  ADD KEY idx_eq_certificate_name (certificate_name),
  ADD KEY idx_eq_first_issue_date (first_issue_date),
  ADD KEY idx_eq_review_date (review_date);
