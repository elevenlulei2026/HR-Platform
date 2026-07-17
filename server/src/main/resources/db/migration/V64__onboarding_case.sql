-- Slice 8：入职办理 onboarding_case

CREATE TABLE IF NOT EXISTS onboarding_case (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  case_no VARCHAR(64) NOT NULL,
  candidate_name VARCHAR(128) NOT NULL,
  mobile VARCHAR(64) NOT NULL,
  gender VARCHAR(16) NULL,
  organization_id BIGINT NOT NULL,
  position_id BIGINT NOT NULL,
  expected_hire_date DATE NOT NULL,
  employment_type VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  workflow_instance_id BIGINT NULL,
  employee_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_onboarding_case_no (case_no),
  KEY idx_onboarding_case_status (status),
  KEY idx_onboarding_case_org (organization_id),
  KEY idx_onboarding_case_employee (employee_id),
  KEY idx_onboarding_case_workflow (workflow_instance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 入职单据号：OB-{yyyy}{MM}{dd}-{seq}
INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key, status)
SELECT 'ONBOARDING_CASE_NO', '入职单据号', 'OB-{yyyy}{MM}{dd}-{seq}', 'DAY', 1, 4, 0, NULL, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code = 'ONBOARDING_CASE_NO');

-- 编辑权限
INSERT INTO permission (code, name, description, status)
SELECT 'onboarding:edit', '入职办理编辑', '创建/编辑/提交/取消/完成入职办理', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'onboarding:edit');

UPDATE permission p
JOIN sys_menu m ON m.code = 'onboarding' AND m.status = 'ACTIVE'
SET p.menu_id = m.id,
    p.module_code = 'onboarding',
    p.resource_code = 'onboarding',
    p.action_code = 'edit'
WHERE p.code = 'onboarding:edit';

UPDATE permission
SET module_code = 'onboarding',
    resource_code = 'onboarding',
    action_code = 'view'
WHERE code = 'onboarding:view'
  AND (module_code IS NULL OR module_code = '');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'onboarding:edit'
WHERE r.code IN ('admin', 'hr')
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 发布入职流程定义（演示可用）
UPDATE workflow_definition
SET status = 'PUBLISHED'
WHERE code = 'onboarding' AND version = 1 AND status = 'DRAFT';
