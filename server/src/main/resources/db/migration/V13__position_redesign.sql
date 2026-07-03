-- 岗位体系重设计：移除职务/职级，扩展岗位字段

-- 1) 解除岗位与职务外键，删除旧字段
ALTER TABLE position DROP FOREIGN KEY fk_position_job;
ALTER TABLE position DROP INDEX idx_position_job;
ALTER TABLE position DROP COLUMN job_id;
ALTER TABLE position DROP COLUMN headcount;

-- 2) 岗位新字段
ALTER TABLE position
  ADD COLUMN effective_start_date DATE NOT NULL DEFAULT (CURRENT_DATE) AFTER name,
  ADD COLUMN occupational_disease VARCHAR(8) NOT NULL DEFAULT 'NO' COMMENT 'YES/NO' AFTER status,
  ADD COLUMN position_category VARCHAR(64) NULL COMMENT '岗位分类 dict' AFTER occupational_disease,
  ADD COLUMN position_kind VARCHAR(16) NULL COMMENT 'OFFICE/NON_OFFICE' AFTER position_category,
  ADD COLUMN position_sequence VARCHAR(8) NULL COMMENT 'P/M/T' AFTER position_kind,
  ADD COLUMN position_level VARCHAR(16) NULL COMMENT '岗位职级 dict' AFTER position_sequence,
  ADD COLUMN key_position VARCHAR(8) NOT NULL DEFAULT 'NO' COMMENT 'YES/NO' AFTER position_level,
  ADD COLUMN identity_category VARCHAR(64) NULL COMMENT '身份类别 dict' AFTER key_position;

ALTER TABLE position ADD KEY idx_position_effective (effective_start_date);

-- 3) 删除职务、职级表
DROP TABLE IF EXISTS job_grade;
DROP TABLE IF EXISTS job;

-- 4) 岗位编码规则：八位流水，从 20000000 起
INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key, status)
SELECT 'POSITION_CODE', '岗位编码', '{seq}', 'NEVER', 20000000, 8, 19999999, NULL, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code = 'POSITION_CODE');

-- 5) 字典：岗位分类
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'POSITION_CATEGORY', '岗位分类', '岗位业务分类', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'POSITION_CATEGORY');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_CATEGORY', 'DIRECT_WORKER_1', '直接工人1', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_CATEGORY' AND value = 'DIRECT_WORKER_1');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_CATEGORY', 'INDIRECT_WORKER', '间接工人', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_CATEGORY' AND value = 'INDIRECT_WORKER');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_CATEGORY', 'MANAGEMENT', '管理岗', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_CATEGORY' AND value = 'MANAGEMENT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_CATEGORY', 'TECHNICAL', '技术岗', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_CATEGORY' AND value = 'TECHNICAL');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_CATEGORY', 'SUPPORT', '支撑岗', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_CATEGORY' AND value = 'SUPPORT');

-- 6) 字典：岗位职级（1~15）
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'POSITION_LEVEL', '岗位职级', '岗位职级数字 1~15', 'ACTIVE', 51
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'POSITION_LEVEL');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '1', '1', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '1');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '2', '2', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '2');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '3', '3', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '3');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '4', '4', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '4');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '5', '5', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '5');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '6', '6', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '6');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '7', '7', 'ACTIVE', 70
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '7');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '8', '8', 'ACTIVE', 80
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '8');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '9', '9', 'ACTIVE', 90
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '9');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '10', '10', 'ACTIVE', 100
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '10');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '11', '11', 'ACTIVE', 110
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '11');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '12', '12', 'ACTIVE', 120
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '12');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '13', '13', 'ACTIVE', 130
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '13');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '14', '14', 'ACTIVE', 140
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '14');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POSITION_LEVEL', '15', '15', 'ACTIVE', 150
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POSITION_LEVEL' AND value = '15');

-- 7) 字典：身份类别
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'IDENTITY_CATEGORY', '身份类别', '岗位身份类别', 'ACTIVE', 52
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'IDENTITY_CATEGORY');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'IDENTITY_CATEGORY', 'MANAGEMENT', '管理人员', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'IDENTITY_CATEGORY' AND value = 'MANAGEMENT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'IDENTITY_CATEGORY', 'SALES_GUIDE', '导购', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'IDENTITY_CATEGORY' AND value = 'SALES_GUIDE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'IDENTITY_CATEGORY', 'FRONTLINE', '一线人员', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'IDENTITY_CATEGORY' AND value = 'FRONTLINE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'IDENTITY_CATEGORY', 'DIRECT_PRODUCTION', '直产人员', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'IDENTITY_CATEGORY' AND value = 'DIRECT_PRODUCTION');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'IDENTITY_CATEGORY', 'DIRECT_SUPPORT', '直辅人员', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'IDENTITY_CATEGORY' AND value = 'DIRECT_SUPPORT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'IDENTITY_CATEGORY', 'INDIRECT', '间接人员', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'IDENTITY_CATEGORY' AND value = 'INDIRECT');

-- 8) 权限描述更新
UPDATE permission SET description = '查看岗位体系' WHERE code = 'position:view';
UPDATE permission SET name = '岗位体系维护', description = '创建/维护岗位' WHERE code = 'position:edit';
