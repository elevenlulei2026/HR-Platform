-- 员工档案-智能体归属：字段全面调整（删除旧字段，按业务清单重建）

-- 1) 删除旧索引（依赖即将删除/重命名的列）
ALTER TABLE employee_agent_assignment
  DROP INDEX idx_eaa_agent_id,
  DROP INDEX idx_eaa_effective;

-- 2) 迁移旧数据到新列语义，并删除旧业务列
--    agent_id → agent_identity（智能体识别）
--    effective_start_date / effective_end_date → start_date / end_date
ALTER TABLE employee_agent_assignment
  CHANGE COLUMN agent_id agent_identity VARCHAR(256) NULL COMMENT '智能体识别',
  CHANGE COLUMN effective_start_date start_date DATE NULL COMMENT '开始日期',
  CHANGE COLUMN effective_end_date end_date DATE NULL COMMENT '结束日期',
  DROP COLUMN assignment_type,
  DROP COLUMN remark;

-- 3) 新增业务列，并按业务清单重排列顺序
ALTER TABLE employee_agent_assignment
  ADD COLUMN primary_agent_tag VARCHAR(8) NULL COMMENT '主智能体标签 YES/NO' AFTER employee_id,
  MODIFY COLUMN start_date DATE NULL COMMENT '开始日期' AFTER primary_agent_tag,
  MODIFY COLUMN end_date DATE NULL COMMENT '结束日期' AFTER start_date,
  MODIFY COLUMN agent_name VARCHAR(128) NULL COMMENT '智能体' AFTER end_date,
  MODIFY COLUMN agent_identity VARCHAR(256) NULL COMMENT '智能体识别' AFTER agent_name,
  ADD COLUMN agent_role VARCHAR(128) NULL COMMENT '智能体岗位角色' AFTER agent_identity,
  ADD COLUMN is_architect VARCHAR(8) NULL COMMENT '架构师 YES/NO' AFTER agent_role,
  ADD COLUMN is_militia VARCHAR(8) NULL COMMENT '民兵 YES/NO' AFTER is_architect,
  ADD COLUMN is_data_steward VARCHAR(8) NULL COMMENT '数据治理师 YES/NO' AFTER is_militia,
  ADD COLUMN percentage DECIMAL(5, 2) NULL COMMENT '占比（%）' AFTER is_data_steward;

-- 4) 常用查询索引
ALTER TABLE employee_agent_assignment
  ADD KEY idx_eaa_primary_tag (primary_agent_tag),
  ADD KEY idx_eaa_dates (start_date, end_date),
  ADD KEY idx_eaa_agent_identity (agent_identity);
