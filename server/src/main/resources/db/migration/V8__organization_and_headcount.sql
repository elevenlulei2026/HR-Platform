-- Slice 5 & 6：组织岗位 + 编制

CREATE TABLE IF NOT EXISTS legal_entity (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  credit_code VARCHAR(64) NULL,
  region VARCHAR(64) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_legal_entity_code (code),
  KEY idx_legal_entity_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cost_center (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  legal_entity_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_cost_center_code (code),
  KEY idx_cost_center_legal_entity (legal_entity_id),
  KEY idx_cost_center_status (status),
  CONSTRAINT fk_cost_center_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS organization (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  parent_code VARCHAR(64) NULL,
  parent_id BIGINT NULL,
  org_type VARCHAR(32) NOT NULL,
  legal_entity_id BIGINT NOT NULL,
  cost_center_id BIGINT NULL,
  manager_employee_id BIGINT NULL,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_org_parent_code (parent_code),
  KEY idx_org_parent_start (parent_id, effective_start_date),
  KEY idx_org_code_end (code, effective_end_date),
  KEY idx_org_effective (effective_start_date, effective_end_date),
  KEY idx_org_legal_entity (legal_entity_id),
  CONSTRAINT fk_org_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(id),
  CONSTRAINT fk_org_cost_center FOREIGN KEY (cost_center_id) REFERENCES cost_center(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_job_code (code),
  KEY idx_job_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS job_grade (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  sequence_order INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_job_grade_code (code),
  KEY idx_job_grade_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS position (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  organization_id BIGINT NOT NULL,
  job_id BIGINT NOT NULL,
  headcount INT NOT NULL DEFAULT 1,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_position_code (code),
  KEY idx_position_org (organization_id),
  KEY idx_position_job (job_id),
  KEY idx_position_status (status),
  CONSTRAINT fk_position_org FOREIGN KEY (organization_id) REFERENCES organization(id),
  CONSTRAINT fk_position_job FOREIGN KEY (job_id) REFERENCES job(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS headcount_plan (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  organization_id BIGINT NOT NULL,
  fiscal_year INT NOT NULL,
  planned_count INT NOT NULL DEFAULT 0,
  occupied_count INT NOT NULL DEFAULT 0,
  reserved_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_headcount_org_year (organization_id, fiscal_year),
  KEY idx_headcount_fiscal_year (fiscal_year),
  CONSTRAINT fk_headcount_org FOREIGN KEY (organization_id) REFERENCES organization(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 编辑权限点
INSERT INTO permission (code, name, description, status)
SELECT 'organization:edit', '组织架构维护', '创建/调整组织', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'organization:edit');

INSERT INTO permission (code, name, description, status)
SELECT 'position:edit', '岗位体系维护', '创建/维护岗位/职务/职级', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'position:edit');

INSERT INTO permission (code, name, description, status)
SELECT 'headcount:edit', '编制管理维护', '维护编制计划', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'headcount:edit');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN ('organization:edit', 'position:edit', 'headcount:edit')
WHERE r.code = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 种子：法人、成本中心、根组织
INSERT INTO legal_entity (code, name, credit_code, region, status)
SELECT 'LE-DEFAULT', '默认法人实体', NULL, 'CN', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM legal_entity WHERE code = 'LE-DEFAULT');

INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-DEFAULT', '默认成本中心', le.id, 'ACTIVE'
FROM legal_entity le
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-DEFAULT');

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-ROOT', '集团总部', NULL, NULL, 'COMPANY', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-DEFAULT'
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-ROOT' AND effective_end_date IS NULL);

INSERT INTO job (code, name, description, status)
SELECT 'JOB-MGR', '管理岗', '管理类职务', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-MGR');

INSERT INTO job (code, name, description, status)
SELECT 'JOB-PRO', '专业岗', '专业类职务', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-PRO');

INSERT INTO job_grade (code, name, sequence_order, status)
SELECT 'G1', '职级 1', 10, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'G1');

INSERT INTO job_grade (code, name, sequence_order, status)
SELECT 'G2', '职级 2', 20, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'G2');

INSERT INTO job_grade (code, name, sequence_order, status)
SELECT 'G3', '职级 3', 30, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'G3');
