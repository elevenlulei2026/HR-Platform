-- 员工档案-绩效记录：字段调整 + 考核类型/价值观等级/绩效等级数据字典

-- 1) 表结构：旧字段迁移 / 删除，新字段落库
ALTER TABLE employee_performance_record
  CHANGE COLUMN period year VARCHAR(32) NULL COMMENT '年度',
  CHANGE COLUMN rating performance_level VARCHAR(32) NULL COMMENT '绩效等级（字典 PERFORMANCE_LEVEL）',
  CHANGE COLUMN score performance_score VARCHAR(64) NULL COMMENT '绩效得分（文本手填）',
  MODIFY COLUMN remark TEXT NULL COMMENT '备注',
  ADD COLUMN assessment_type VARCHAR(64) NULL COMMENT '考核类型（字典 PERFORMANCE_ASSESSMENT_TYPE）' AFTER year,
  ADD COLUMN performance_start_date DATE NULL COMMENT '绩效开始日期' AFTER assessment_type,
  ADD COLUMN performance_end_date DATE NULL COMMENT '绩效结束日期' AFTER performance_start_date,
  ADD COLUMN values_level VARCHAR(32) NULL COMMENT '价值观等级（字典 PERFORMANCE_VALUES_LEVEL）' AFTER performance_end_date,
  ADD COLUMN values_score VARCHAR(64) NULL COMMENT '价值观得分（文本手填）' AFTER performance_score,
  DROP COLUMN rating_label,
  DROP COLUMN reviewer_name,
  DROP COLUMN review_date,
  DROP COLUMN source_type;

-- 年度：从旧 period（如 2025-H2）尽量归一为四位年份
UPDATE employee_performance_record
SET year = LEFT(year, 4)
WHERE year REGEXP '^[0-9]{4}';

-- 索引：旧 review_date 索引随列删除；补充新字段索引
ALTER TABLE employee_performance_record
  DROP INDEX idx_epr_period,
  ADD KEY idx_epr_year (year),
  ADD KEY idx_epr_perf_start (performance_start_date);

-- 2) 数据字典：考核类型
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'PERFORMANCE_ASSESSMENT_TYPE', '考核类型', '员工档案-绩效记录：考核类型', 'ACTIVE', 94
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'PERFORMANCE_ASSESSMENT_TYPE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_ASSESSMENT_TYPE', 'MID_YEAR', '年中', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_ASSESSMENT_TYPE' AND value = 'MID_YEAR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_ASSESSMENT_TYPE', 'YEAR_END', '年底', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_ASSESSMENT_TYPE' AND value = 'YEAR_END');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_ASSESSMENT_TYPE', 'QUARTER', '季度', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_ASSESSMENT_TYPE' AND value = 'QUARTER');

-- 3) 数据字典：价值观等级
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'PERFORMANCE_VALUES_LEVEL', '价值观等级', '员工档案-绩效记录：价值观等级', 'ACTIVE', 95
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'PERFORMANCE_VALUES_LEVEL');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_VALUES_LEVEL', 'A', 'A', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_VALUES_LEVEL' AND value = 'A');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_VALUES_LEVEL', 'B', 'B', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_VALUES_LEVEL' AND value = 'B');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_VALUES_LEVEL', 'C', 'C', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_VALUES_LEVEL' AND value = 'C');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_VALUES_LEVEL', 'NA', 'NA', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_VALUES_LEVEL' AND value = 'NA');

-- 4) 数据字典：绩效等级
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'PERFORMANCE_LEVEL', '绩效等级', '员工档案-绩效记录：绩效等级', 'ACTIVE', 96
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'PERFORMANCE_LEVEL');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_LEVEL', 'A', 'A', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_LEVEL' AND value = 'A');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_LEVEL', 'B', 'B', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_LEVEL' AND value = 'B');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_LEVEL', 'B+', 'B+', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_LEVEL' AND value = 'B+');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_LEVEL', 'B-', 'B-', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_LEVEL' AND value = 'B-');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_LEVEL', 'C', 'C', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_LEVEL' AND value = 'C');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_LEVEL', 'D', 'D', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_LEVEL' AND value = 'D');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PERFORMANCE_LEVEL', 'NA', 'NA', 'ACTIVE', 70
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PERFORMANCE_LEVEL' AND value = 'NA');
