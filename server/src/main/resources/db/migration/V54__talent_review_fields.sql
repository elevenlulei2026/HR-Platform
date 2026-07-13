-- 员工档案-人才盘点：字段全面调整（删除旧字段，按业务清单重建）

-- 1) 删除旧索引（依赖即将删除的列）
ALTER TABLE employee_talent_review
  DROP INDEX idx_etrv_review_cycle,
  DROP INDEX idx_etrv_review_date;

-- 2) 删除旧业务列
ALTER TABLE employee_talent_review
  DROP COLUMN review_cycle,
  DROP COLUMN grid_position,
  DROP COLUMN potential_level,
  DROP COLUMN performance_level,
  DROP COLUMN reviewer_name,
  DROP COLUMN review_date,
  DROP COLUMN remark;

-- 3) 新增业务列（均为文本手填；主观评价为长文本）
ALTER TABLE employee_talent_review
  ADD COLUMN year VARCHAR(32) NULL COMMENT '年份（文本手填）' AFTER employee_id,
  ADD COLUMN performance_score VARCHAR(64) NULL COMMENT '绩效得分' AFTER year,
  ADD COLUMN performance_placement VARCHAR(64) NULL COMMENT '绩效落位' AFTER performance_score,
  ADD COLUMN potential_score VARCHAR(64) NULL COMMENT '潜力得分' AFTER performance_placement,
  ADD COLUMN potential_placement VARCHAR(64) NULL COMMENT '潜力落位' AFTER potential_score,
  ADD COLUMN values_score VARCHAR(64) NULL COMMENT '价值观得分' AFTER potential_placement,
  ADD COLUMN nine_box_placement VARCHAR(64) NULL COMMENT '九宫格落位' AFTER values_score,
  ADD COLUMN subjective_evaluation TEXT NULL COMMENT '主观评价' AFTER nine_box_placement;

-- 4) 常用查询索引
ALTER TABLE employee_talent_review
  ADD KEY idx_etrv_year (year),
  ADD KEY idx_etrv_nine_box (nine_box_placement);
