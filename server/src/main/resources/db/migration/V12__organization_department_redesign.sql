-- 组织架构全面升级：部门字段重设计 + 字典 + 八位部门编号

-- 1) 字典类型
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'LOCATION', '地点', '组织所在城市（市级）', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'LOCATION');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'LEGAL_COMPANY', '法人公司', '组织归属法人公司', 'ACTIVE', 41
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'LEGAL_COMPANY');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'DEPARTMENT_LEVEL', '部门层级', '组织在架构中的层级', 'ACTIVE', 42
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'DEPARTMENT_LEVEL');

-- 2) 地点（市级样例）
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LOCATION', 'SUZHOU', '苏州', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LOCATION' AND value = 'SUZHOU');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LOCATION', 'SHANGHAI', '上海', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LOCATION' AND value = 'SHANGHAI');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LOCATION', 'BEIJING', '北京', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LOCATION' AND value = 'BEIJING');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LOCATION', 'SHENZHEN', '深圳', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LOCATION' AND value = 'SHENZHEN');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LOCATION', 'CHENGDU', '成都', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LOCATION' AND value = 'CHENGDU');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LOCATION', 'HANGZHOU', '杭州', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LOCATION' AND value = 'HANGZHOU');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LOCATION', 'GUANGZHOU', '广州', 'ACTIVE', 70
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LOCATION' AND value = 'GUANGZHOU');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LOCATION', 'NANJING', '南京', 'ACTIVE', 80
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LOCATION' AND value = 'NANJING');

-- 3) 法人公司（与演示法人实体对齐）
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LEGAL_COMPANY', 'LE-DEFAULT', '星河数字科技有限公司', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LEGAL_COMPANY' AND value = 'LE-DEFAULT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LEGAL_COMPANY', 'LE-STAR-HOLDING', '星河控股集团有限公司', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LEGAL_COMPANY' AND value = 'LE-STAR-HOLDING');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LEGAL_COMPANY', 'LE-STAR-SZ', '星河软件（深圳）有限公司', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LEGAL_COMPANY' AND value = 'LE-STAR-SZ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'LEGAL_COMPANY', 'LE-STAR-CD', '星河科技（成都）有限公司', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'LEGAL_COMPANY' AND value = 'LE-STAR-CD');

-- 4) 部门层级
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_LEVEL', 'L1', '一级组织', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_LEVEL' AND value = 'L1');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_LEVEL', 'L2', '二级组织', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_LEVEL' AND value = 'L2');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_LEVEL', 'L3', '三级组织', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_LEVEL' AND value = 'L3');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_LEVEL', 'L4', '四级组织', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_LEVEL' AND value = 'L4');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_LEVEL', 'L5', '五级组织', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_LEVEL' AND value = 'L5');

-- 5) 部门编号编码规则：八位流水，从 20000000 起
INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key)
SELECT 'DEPT_CODE', '部门编号', '{seq}', 'NEVER', 20000000, 8, 19999999, NULL
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code = 'DEPT_CODE');

-- 6) 组织表字段扩展
ALTER TABLE organization
  ADD COLUMN location VARCHAR(64) NULL AFTER department_type,
  ADD COLUMN legal_company VARCHAR(64) NULL AFTER location,
  ADD COLUMN department_level VARCHAR(64) NULL AFTER legal_company,
  ADD COLUMN cost_center VARCHAR(128) NULL AFTER department_level,
  ADD COLUMN org_leader_no VARCHAR(64) NULL AFTER cost_center,
  ADD COLUMN supervising_leader_no VARCHAR(64) NULL AFTER org_leader_no,
  ADD COLUMN org_attribute VARCHAR(16) NULL AFTER supervising_leader_no,
  ADD COLUMN org_function VARCHAR(32) NULL AFTER org_attribute,
  ADD COLUMN org_tags VARCHAR(255) NULL AFTER org_function,
  ADD COLUMN financial_code VARCHAR(64) NULL AFTER org_tags,
  ADD COLUMN hr_coordinator_no VARCHAR(64) NULL AFTER financial_code,
  ADD COLUMN hrbp_no VARCHAR(64) NULL AFTER hr_coordinator_no,
  ADD COLUMN ssc_no VARCHAR(64) NULL AFTER hrbp_no;

-- 7) 迁移既有数据
UPDATE organization o
JOIN legal_entity le ON o.legal_entity_id = le.id
SET o.legal_company = le.code
WHERE o.legal_company IS NULL;

UPDATE organization o
JOIN cost_center cc ON o.cost_center_id = cc.id
SET o.cost_center = cc.name
WHERE o.cost_center IS NULL AND o.cost_center_id IS NOT NULL;

UPDATE organization SET location = 'SHANGHAI' WHERE location IS NULL;

UPDATE organization SET department_level = 'L1'
WHERE department_level IS NULL AND org_type IN ('COMPANY', 'DIVISION');
UPDATE organization SET department_level = 'L2'
WHERE department_level IS NULL AND org_type = 'DEPARTMENT';
UPDATE organization SET department_level = 'L3'
WHERE department_level IS NULL AND org_type = 'TEAM';

-- 8) 移除外键与废弃列
ALTER TABLE organization DROP FOREIGN KEY fk_org_legal_entity;
ALTER TABLE organization DROP FOREIGN KEY fk_org_cost_center;

ALTER TABLE organization
  DROP COLUMN legal_entity_id,
  DROP COLUMN cost_center_id,
  DROP COLUMN manager_employee_id;

ALTER TABLE organization
  ADD KEY idx_org_location (location),
  ADD KEY idx_org_legal_company (legal_company),
  ADD KEY idx_org_department_level (department_level);
