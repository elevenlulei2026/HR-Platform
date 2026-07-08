-- 通用父子值配置（两级目录）：类型 + 父项 + 子项
-- 兼容：员工组/子组将作为一个 typeCode（EMPLOYEE_GROUP）

CREATE TABLE IF NOT EXISTS parent_child_type (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_parent_child_type_code (code),
  KEY idx_parent_child_type_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parent_child_item (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  type_code VARCHAR(32) NOT NULL,
  parent_code VARCHAR(32) NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_parent_child_item_type_code (type_code, code),
  KEY idx_parent_child_item_type_parent (type_code, parent_code),
  KEY idx_parent_child_item_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 预置一个类型：员工组/子组
INSERT INTO parent_child_type (code, name, description, status, sort)
SELECT 'EMPLOYEE_GROUP', '员工组/子组', '任职信息中员工组/子组联动选择', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM parent_child_type WHERE code = 'EMPLOYEE_GROUP');

-- 从旧表迁移（若存在）：员工组/子组 → 父项/子项
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'EMPLOYEE_GROUP', NULL, eg.code, eg.name, eg.status, eg.sort, eg.remark
FROM employee_group eg
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'EMPLOYEE_GROUP' AND pci.code = eg.code
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'EMPLOYEE_GROUP', esg.employee_group_code, esg.code, esg.name, esg.status, esg.sort, esg.remark
FROM employee_subgroup esg
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'EMPLOYEE_GROUP' AND pci.code = esg.code
);

