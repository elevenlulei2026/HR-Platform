-- Slice 7：员工主数据

CREATE TABLE IF NOT EXISTS employee (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_no VARCHAR(64) NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  ad_account VARCHAR(128) NULL,
  gender VARCHAR(16) NULL,
  mobile VARCHAR(512) NOT NULL COMMENT 'AES 加密存储',
  company_email VARCHAR(128) NULL,
  personal_email VARCHAR(128) NULL,
  hire_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  user_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_employee_no (employee_no),
  KEY idx_employee_status (status),
  KEY idx_employee_hire_date (hire_date),
  KEY idx_employee_full_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_id_document (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  country_region VARCHAR(64) NULL,
  id_type VARCHAR(32) NULL,
  id_number VARCHAR(512) NOT NULL COMMENT 'AES 加密存储',
  valid_from DATE NULL,
  valid_to DATE NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eid_employee_id (employee_id),
  CONSTRAINT fk_eid_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_assignment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  organization_id BIGINT NOT NULL,
  position_id BIGINT NOT NULL,
  employment_type VARCHAR(64) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 1,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_ea_employee (employee_id, effective_start_date),
  KEY idx_ea_org (organization_id),
  KEY idx_ea_position (position_id),
  KEY idx_ea_primary (employee_id, is_primary, effective_end_date),
  CONSTRAINT fk_ea_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id),
  CONSTRAINT fk_ea_organization_id FOREIGN KEY (organization_id) REFERENCES organization(id),
  CONSTRAINT fk_ea_position_id FOREIGN KEY (position_id) REFERENCES `position`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reporting_line (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  manager_employee_id BIGINT NOT NULL,
  line_type VARCHAR(16) NOT NULL DEFAULT 'DIRECT',
  effective_start_date DATE NOT NULL,
  effective_end_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_rl_employee (employee_id, effective_start_date),
  KEY idx_rl_manager (manager_employee_id),
  CONSTRAINT fk_rl_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id),
  CONSTRAINT fk_rl_manager_employee_id FOREIGN KEY (manager_employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_movement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  movement_type VARCHAR(8) NOT NULL,
  movement_type_name VARCHAR(64) NOT NULL,
  reason_code VARCHAR(8) NULL,
  reason_description VARCHAR(128) NULL,
  reason_sub_code VARCHAR(8) NULL,
  reason_sub_description VARCHAR(128) NULL,
  effective_date DATE NOT NULL,
  from_assignment_id BIGINT NULL,
  to_assignment_id BIGINT NULL,
  source_request_type VARCHAR(32) NULL,
  source_request_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  KEY idx_em_employee (employee_id, effective_date),
  KEY idx_em_type (movement_type),
  CONSTRAINT fk_em_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 字典：性别、雇佣类型、异动原因
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'GENDER', '性别', '员工性别', 'ACTIVE', 11
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'GENDER');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'GENDER', 'MALE', '男', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'GENDER' AND value = 'MALE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'GENDER', 'FEMALE', '女', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'GENDER' AND value = 'FEMALE');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'EMPLOYMENT_TYPE', '雇佣类型', '员工类别/雇佣类型', 'ACTIVE', 12
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'EMPLOYMENT_TYPE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYMENT_TYPE', 'FULL_TIME', '正式工', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYMENT_TYPE' AND value = 'FULL_TIME');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYMENT_TYPE', 'INTERN', '实习生', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYMENT_TYPE' AND value = 'INTERN');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYMENT_TYPE', 'CONTRACT', '合同工', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYMENT_TYPE' AND value = 'CONTRACT');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'MOVEMENT_REASON', '异动原因', '职务数据异动原因码（有效项）', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'MOVEMENT_REASON');

INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'H01', '初次入职', 'ACTIVE', 10, JSON_OBJECT('movementType', 'HIR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'H01');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'H02', '开始兼职', 'ACTIVE', 11, JSON_OBJECT('movementType', 'HIR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'H02');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'R01', '离职后入职', 'ACTIVE', 20, JSON_OBJECT('movementType', 'REH')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'R01');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'R02', '退休返聘', 'ACTIVE', 21, JSON_OBJECT('movementType', 'REH')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'R02');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'P01', '正常转正', 'ACTIVE', 30, JSON_OBJECT('movementType', 'PRC')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'P01');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'P02', '提前转正', 'ACTIVE', 31, JSON_OBJECT('movementType', 'PRC')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'P02');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'P03', '延迟转正', 'ACTIVE', 32, JSON_OBJECT('movementType', 'PRC')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'P03');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X01', '部门内调动', 'ACTIVE', 40, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X01');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X02', '跨部门调动', 'ACTIVE', 41, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X02');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'TA', '主动离职', 'ACTIVE', 50, JSON_OBJECT('movementType', 'TER')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'TA');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'TB', '被动离职', 'ACTIVE', 51, JSON_OBJECT('movementType', 'TER')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'TB');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'DT4', '其他数据更改', 'ACTIVE', 60, JSON_OBJECT('movementType', 'DTA')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'DT4');

-- 权限点
INSERT INTO permission (code, name, description, status)
SELECT 'employee:edit', '花名册维护', '新建/编辑员工主档', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:edit');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:sensitive:view', '敏感字段查看', '查看手机号/证件号明文', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:sensitive:view');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:export', '花名册导出', '导出员工花名册并写审计', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:export');

INSERT INTO permission (code, name, description, status)
SELECT 'reporting-line:edit', '汇报关系维护', '新建/编辑汇报关系', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'reporting-line:edit');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'employee:edit', 'employee:sensitive:view', 'employee:export', 'reporting-line:edit'
)
WHERE r.code = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
