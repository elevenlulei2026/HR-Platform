-- 通勤与住宿拆分为：行政信息 + 住宿信息（均按生效日版本化）
-- 并新增工作环境数据字典

CREATE TABLE IF NOT EXISTS employee_admin_info (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  effective_start_date DATE NOT NULL COMMENT '生效日期',
  effective_end_date DATE NULL COMMENT '生效结束日，NULL=开放',
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE有效/INACTIVE无效',
  work_environment VARCHAR(32) NULL COMMENT '工作环境字典编码',
  take_shuttle VARCHAR(8) NULL COMMENT '乘坐班车 YES/NO',
  parking_permit VARCHAR(8) NULL COMMENT '停车证 YES/NO',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_eai_employee_start (employee_id, effective_start_date),
  KEY idx_eai_employee_id (employee_id),
  KEY idx_eai_effective (effective_start_date, effective_end_date),
  KEY idx_eai_status (status),
  CONSTRAINT fk_eai_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_accommodation (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  effective_start_date DATE NOT NULL COMMENT '生效日期',
  effective_end_date DATE NULL COMMENT '生效结束日，NULL=开放',
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE有效/INACTIVE无效',
  has_accommodation VARCHAR(8) NULL COMMENT '是否住宿 YES/NO',
  accommodation_fee_total DECIMAL(12, 2) NULL COMMENT '住宿费汇总',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_eacc_employee_start (employee_id, effective_start_date),
  KEY idx_eacc_employee_id (employee_id),
  KEY idx_eacc_effective (effective_start_date, effective_end_date),
  KEY idx_eacc_status (status),
  CONSTRAINT fk_eacc_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 历史班车记录 → 行政信息（每人取最早一条作为初始版本）
INSERT INTO employee_admin_info (
  employee_id, effective_start_date, effective_end_date, status,
  take_shuttle, parking_permit, created_at, updated_at, created_by, updated_by
)
SELECT
  c.employee_id,
  COALESCE(c.effective_start_date, CURRENT_DATE),
  c.effective_end_date,
  'ACTIVE',
  'YES',
  'NO',
  c.created_at,
  c.updated_at,
  c.created_by,
  c.updated_by
FROM employee_commute_accommodation c
INNER JOIN (
  SELECT employee_id, MIN(id) AS min_id
  FROM employee_commute_accommodation
  WHERE record_type = 'SHUTTLE' OR record_type IS NULL
  GROUP BY employee_id
) first_row ON first_row.min_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM employee_admin_info a WHERE a.employee_id = c.employee_id
);

-- 历史住宿记录 → 住宿信息
INSERT INTO employee_accommodation (
  employee_id, effective_start_date, effective_end_date, status,
  has_accommodation, accommodation_fee_total, created_at, updated_at, created_by, updated_by
)
SELECT
  c.employee_id,
  COALESCE(c.effective_start_date, CURRENT_DATE),
  c.effective_end_date,
  'ACTIVE',
  'YES',
  NULL,
  c.created_at,
  c.updated_at,
  c.created_by,
  c.updated_by
FROM employee_commute_accommodation c
INNER JOIN (
  SELECT employee_id, MIN(id) AS min_id
  FROM employee_commute_accommodation
  WHERE record_type = 'ACCOMMODATION'
  GROUP BY employee_id
) first_row ON first_row.min_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM employee_accommodation a WHERE a.employee_id = c.employee_id
);

DROP TABLE IF EXISTS employee_commute_accommodation;

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'WORK_ENVIRONMENT', '工作环境', '员工档案-行政信息：工作环境', 'ACTIVE', 80
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'WORK_ENVIRONMENT');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'WORK_ENVIRONMENT', '10', '空调', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'WORK_ENVIRONMENT' AND value = '10');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'WORK_ENVIRONMENT', '20', '半空调', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'WORK_ENVIRONMENT' AND value = '20');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'WORK_ENVIRONMENT', '30', '无空调', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'WORK_ENVIRONMENT' AND value = '30');
