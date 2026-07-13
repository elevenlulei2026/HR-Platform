-- 员工档案-培训记录：字段调整 + 考核/形式/类型数据字典

-- 1) 表结构
ALTER TABLE employee_training_record
  CHANGE COLUMN training_name course_name VARCHAR(128) NULL COMMENT '课程名称',
  CHANGE COLUMN result assessment_result VARCHAR(64) NULL COMMENT '考核结果（字典 TRAINING_ASSESSMENT_RESULT）',
  MODIFY COLUMN training_type VARCHAR(64) NULL COMMENT '培训类型（字典 TRAINING_TYPE）',
  MODIFY COLUMN remark TEXT NULL COMMENT '备注',
  ADD COLUMN assessment_method VARCHAR(64) NULL COMMENT '考核方式（字典 TRAINING_ASSESSMENT_METHOD）',
  ADD COLUMN feedback_result TEXT NULL COMMENT '评估反馈结果',
  ADD COLUMN training_form VARCHAR(64) NULL COMMENT '培训形式（字典 TRAINING_FORM）',
  ADD COLUMN training_location VARCHAR(256) NULL COMMENT '培训地点',
  ADD COLUMN trainer VARCHAR(128) NULL COMMENT '培训讲师',
  ADD COLUMN training_cost DECIMAL(12, 2) NULL COMMENT '培训费用（元）',
  DROP COLUMN provider,
  DROP COLUMN certificate_no,
  DROP COLUMN attachment_id;

-- 2) 数据字典：考核方式
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'TRAINING_ASSESSMENT_METHOD', '考核方式', '员工档案-培训记录：考核方式', 'ACTIVE', 90
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'TRAINING_ASSESSMENT_METHOD');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_ASSESSMENT_METHOD', '10', '笔试', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_ASSESSMENT_METHOD' AND value = '10');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_ASSESSMENT_METHOD', '20', '面试', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_ASSESSMENT_METHOD' AND value = '20');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_ASSESSMENT_METHOD', '30', '实操', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_ASSESSMENT_METHOD' AND value = '30');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_ASSESSMENT_METHOD', '40', '综合', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_ASSESSMENT_METHOD' AND value = '40');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_ASSESSMENT_METHOD', '50', '无', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_ASSESSMENT_METHOD' AND value = '50');

-- 3) 数据字典：考核结果
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'TRAINING_ASSESSMENT_RESULT', '考核结果', '员工档案-培训记录：考核结果', 'ACTIVE', 91
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'TRAINING_ASSESSMENT_RESULT');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_ASSESSMENT_RESULT', '10', '合格', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_ASSESSMENT_RESULT' AND value = '10');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_ASSESSMENT_RESULT', '20', '不合格', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_ASSESSMENT_RESULT' AND value = '20');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_ASSESSMENT_RESULT', '30', '无', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_ASSESSMENT_RESULT' AND value = '30');

-- 4) 数据字典：培训形式
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'TRAINING_FORM', '培训形式', '员工档案-培训记录：培训形式', 'ACTIVE', 92
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'TRAINING_FORM');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_FORM', '10', '内训', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_FORM' AND value = '10');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_FORM', '20', '外训', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_FORM' AND value = '20');

-- 5) 数据字典：培训类型
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'TRAINING_TYPE', '培训类型', '员工档案-培训记录：培训类型', 'ACTIVE', 93
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'TRAINING_TYPE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_TYPE', '10', '新员工入职', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_TYPE' AND value = '10');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_TYPE', '20', '专业技能类', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_TYPE' AND value = '20');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_TYPE', '30', '通用技能类', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_TYPE' AND value = '30');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_TYPE', '40', '管理及领导力类', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_TYPE' AND value = '40');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'TRAINING_TYPE', '50', '其它类别', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'TRAINING_TYPE' AND value = '50');
