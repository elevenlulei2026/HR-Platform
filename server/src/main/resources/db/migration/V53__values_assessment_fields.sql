-- 员工档案-价值观评估：字段全面调整（删除旧字段，按业务清单重建）

-- 1) 删除旧索引（依赖即将删除的列）
ALTER TABLE employee_values_assessment
  DROP INDEX idx_eva_period,
  DROP INDEX idx_eva_assess_date;

-- 2) 删除旧业务列
ALTER TABLE employee_values_assessment
  DROP COLUMN period,
  DROP COLUMN dimension,
  DROP COLUMN score,
  DROP COLUMN level,
  DROP COLUMN assessor_name,
  DROP COLUMN assess_date,
  DROP COLUMN remark;

-- 3) 新增业务列
ALTER TABLE employee_values_assessment
  ADD COLUMN assessment_time VARCHAR(64) NULL COMMENT '考核时间（文本手填）' AFTER employee_id,
  ADD COLUMN final_level VARCHAR(64) NULL COMMENT '最终等级（文本手填）' AFTER assessment_time,
  ADD COLUMN superior_evaluation VARCHAR(256) NULL COMMENT '上级评价' AFTER final_level,
  ADD COLUMN peer_evaluation VARCHAR(256) NULL COMMENT '同事评价' AFTER superior_evaluation,
  ADD COLUMN subordinate_evaluation VARCHAR(256) NULL COMMENT '下级评价' AFTER peer_evaluation,
  ADD COLUMN user_first VARCHAR(128) NULL COMMENT '用户第一' AFTER subordinate_evaluation,
  ADD COLUMN goal_first VARCHAR(128) NULL COMMENT '目标第一' AFTER user_first,
  ADD COLUMN pragmatic_responsibility VARCHAR(128) NULL COMMENT '实干担当' AFTER goal_first,
  ADD COLUMN good_at_review VARCHAR(128) NULL COMMENT '善于复盘' AFTER pragmatic_responsibility,
  ADD COLUMN dare_to_lead VARCHAR(128) NULL COMMENT '敢为人先' AFTER good_at_review,
  ADD COLUMN quality_efficiency VARCHAR(128) NULL COMMENT '提质增效' AFTER dare_to_lead,
  ADD COLUMN full_commitment VARCHAR(128) NULL COMMENT '全情投入' AFTER quality_efficiency,
  ADD COLUMN love_career VARCHAR(128) NULL COMMENT '热爱事业' AFTER full_commitment,
  ADD COLUMN strive_for_first VARCHAR(128) NULL COMMENT '永争第一' AFTER love_career,
  ADD COLUMN brave_challenge VARCHAR(128) NULL COMMENT '勇于挑战' AFTER strive_for_first,
  ADD COLUMN organization_first VARCHAR(128) NULL COMMENT '组织为重' AFTER brave_challenge,
  ADD COLUMN help_others_succeed VARCHAR(128) NULL COMMENT '成就他人' AFTER organization_first,
  ADD COLUMN integrity_honesty VARCHAR(128) NULL COMMENT '廉洁正直' AFTER help_others_succeed,
  ADD COLUMN law_abiding VARCHAR(128) NULL COMMENT '遵纪守法' AFTER integrity_honesty,
  ADD COLUMN zero_score_text TEXT NULL COMMENT '0分文本' AFTER law_abiding,
  ADD COLUMN four_score_text TEXT NULL COMMENT '4分文本' AFTER zero_score_text,
  ADD COLUMN red_light VARCHAR(128) NULL COMMENT '红灯' AFTER four_score_text,
  ADD COLUMN yellow_light VARCHAR(128) NULL COMMENT '黄灯' AFTER red_light,
  ADD COLUMN green_light VARCHAR(128) NULL COMMENT '绿灯' AFTER yellow_light;

-- 4) 常用查询索引
ALTER TABLE employee_values_assessment
  ADD KEY idx_eva_assessment_time (assessment_time),
  ADD KEY idx_eva_final_level (final_level);
