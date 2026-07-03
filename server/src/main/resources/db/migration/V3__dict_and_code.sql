-- Slice 2：字典与编码

CREATE TABLE IF NOT EXISTS dict_type (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_dict_type_code (code),
  KEY idx_dict_type_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dict_item (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  type_code VARCHAR(64) NOT NULL,
  value VARCHAR(64) NOT NULL,
  label VARCHAR(128) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  ext_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_dict_item_type_value (type_code, value),
  KEY idx_dict_item_type_code (type_code),
  KEY idx_dict_item_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS code_rule (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  pattern VARCHAR(128) NOT NULL,
  seq_reset VARCHAR(16) NOT NULL DEFAULT 'NEVER',
  seq_start INT NOT NULL DEFAULT 1,
  seq_length INT NOT NULL DEFAULT 4,
  last_seq INT NOT NULL DEFAULT 0,
  last_reset_key VARCHAR(16) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_code_rule_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 基础字典种子：员工状态、合同类型
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'EMPLOYEE_STATUS', '员工状态', '员工主数据状态（示例种子）', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'EMPLOYEE_STATUS');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'CONTRACT_TYPE', '合同类型', '员工合同类型（示例种子）', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'CONTRACT_TYPE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_STATUS', 'CANDIDATE', '待入职', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='EMPLOYEE_STATUS' AND value='CANDIDATE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_STATUS', 'PROBATION', '试用', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='EMPLOYEE_STATUS' AND value='PROBATION');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_STATUS', 'ACTIVE', '在职', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='EMPLOYEE_STATUS' AND value='ACTIVE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_STATUS', 'TERMINATED', '离职', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='EMPLOYEE_STATUS' AND value='TERMINATED');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CONTRACT_TYPE', 'LABOR', '劳动合同', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='CONTRACT_TYPE' AND value='LABOR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CONTRACT_TYPE', 'INTERN', '实习协议', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='CONTRACT_TYPE' AND value='INTERN');

-- 编码规则种子：工号、组织编码（示例）
INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key)
SELECT 'EMPLOYEE_NO', '工号', 'EMP-{yyyy}{MM}{dd}-{seq}', 'DAY', 1, 4, 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code='EMPLOYEE_NO');

INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key)
SELECT 'ORG_CODE', '组织编码', 'ORG-{yyyy}{MM}-{seq}', 'MONTH', 1, 3, 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code='ORG_CODE');

