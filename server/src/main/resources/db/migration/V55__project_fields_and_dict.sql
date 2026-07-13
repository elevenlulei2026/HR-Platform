-- 员工档案-项目信息：字段全面调整 + 项目最终成果数据字典

-- 1) 删除旧索引（依赖即将删除的列）
ALTER TABLE employee_project
  DROP INDEX idx_epj_project_code;

-- 2) 旧字段迁移 / 删除
ALTER TABLE employee_project
  CHANGE COLUMN contribution personal_contribution TEXT NULL COMMENT '个人主要贡献',
  DROP COLUMN project_code,
  DROP COLUMN remark;

-- 3) 新增业务列，并按业务清单重排列顺序
ALTER TABLE employee_project
  ADD COLUMN project_description TEXT NULL COMMENT '项目描述' AFTER project_name,
  MODIFY COLUMN start_date DATE NULL COMMENT '项目开始日期' AFTER project_description,
  MODIFY COLUMN end_date DATE NULL COMMENT '项目结束日期' AFTER start_date,
  MODIFY COLUMN role VARCHAR(64) NULL COMMENT '项目角色' AFTER end_date,
  ADD COLUMN responsibility_description TEXT NULL COMMENT '具体职责描述' AFTER role,
  ADD COLUMN report_to VARCHAR(128) NULL COMMENT '汇报对象' AFTER responsibility_description,
  ADD COLUMN subordinates_or_mentees VARCHAR(256) NULL COMMENT '下属或指导人员' AFTER report_to,
  ADD COLUMN core_skills TEXT NULL COMMENT '核心技能' AFTER subordinates_or_mentees,
  MODIFY COLUMN personal_contribution TEXT NULL COMMENT '个人主要贡献' AFTER core_skills,
  ADD COLUMN quantifiable_results TEXT NULL COMMENT '可量化的成果和指标' AFTER personal_contribution,
  ADD COLUMN final_outcome VARCHAR(32) NULL COMMENT '项目最终成果（字典 PROJECT_FINAL_OUTCOME）' AFTER quantifiable_results;

-- 4) 常用查询索引
ALTER TABLE employee_project
  ADD KEY idx_epj_final_outcome (final_outcome);

-- 5) 数据字典：项目最终成果
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'PROJECT_FINAL_OUTCOME', '项目最终成果', '员工档案-项目信息：项目最终成果', 'ACTIVE', 97
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'PROJECT_FINAL_OUTCOME');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PROJECT_FINAL_OUTCOME', '1', '成功上线', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROJECT_FINAL_OUTCOME' AND value = '1');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PROJECT_FINAL_OUTCOME', '2', '达到预期', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROJECT_FINAL_OUTCOME' AND value = '2');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PROJECT_FINAL_OUTCOME', '3', '部分达到', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROJECT_FINAL_OUTCOME' AND value = '3');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PROJECT_FINAL_OUTCOME', '4', '未达到', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROJECT_FINAL_OUTCOME' AND value = '4');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PROJECT_FINAL_OUTCOME', '5', '中止', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROJECT_FINAL_OUTCOME' AND value = '5');
