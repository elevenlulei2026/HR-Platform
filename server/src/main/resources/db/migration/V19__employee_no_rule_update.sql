-- 工号规则：入职年份后两位 + 入职月份 + 四位流水码（按月分桶递增）
-- 样例：25060031 = 25（2025年）+ 06（6月）+ 0031

CREATE TABLE IF NOT EXISTS code_rule_seq_bucket (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_id BIGINT NOT NULL,
  reset_key VARCHAR(16) NOT NULL,
  last_seq INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_code_rule_seq_bucket (rule_id, reset_key),
  KEY idx_code_rule_seq_bucket_rule (rule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

UPDATE code_rule
SET pattern = '{yy}{MM}{seq}',
    seq_reset = 'MONTH',
    seq_start = 1,
    seq_length = 4,
    last_seq = 0,
    last_reset_key = NULL
WHERE code = 'EMPLOYEE_NO';
