-- Slice 12：离职办理 offboarding_case + 交接 checklist

CREATE TABLE IF NOT EXISTS offboarding_case (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  case_no VARCHAR(64) NOT NULL,
  employee_id BIGINT NOT NULL,
  assignment_id BIGINT NOT NULL,
  last_work_day DATE NOT NULL,
  reason_code VARCHAR(16) NOT NULL,
  reason_sub_code VARCHAR(16) NULL,
  handover_to_employee_id BIGINT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'APPLIED',
  workflow_instance_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_offboarding_case_no (case_no),
  KEY idx_offboarding_employee (employee_id),
  KEY idx_offboarding_assignment (assignment_id),
  KEY idx_offboarding_status (status),
  KEY idx_offboarding_workflow (workflow_instance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offboarding_handover_item (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  case_id BIGINT NOT NULL,
  title VARCHAR(256) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  done TINYINT(1) NOT NULL DEFAULT 0,
  done_at DATETIME NULL,
  done_by BIGINT NULL,
  assignee_note VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_offboarding_item_case (case_id),
  CONSTRAINT fk_offboarding_item_case FOREIGN KEY (case_id) REFERENCES offboarding_case (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 离职单据号：OB-{yyyy}{MM}{dd}-{seq}
INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key, status)
SELECT 'OFFBOARDING_CASE_NO', '离职单据号', 'OB-{yyyy}{MM}{dd}-{seq}', 'DAY', 1, 4, 0, NULL, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code = 'OFFBOARDING_CASE_NO');

-- 离职编辑权限
INSERT INTO permission (code, name, description, status)
SELECT 'offboarding:edit', '离职办理编辑', '发起/编辑/提交/取消/完成离职单据与交接清单', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'offboarding:edit');

UPDATE permission p
JOIN sys_menu m ON m.code = 'offboarding' AND m.status = 'ACTIVE'
SET p.menu_id = m.id,
    p.module_code = 'offboarding',
    p.resource_code = 'offboarding',
    p.action_code = 'edit'
WHERE p.code = 'offboarding:edit';

UPDATE permission
SET module_code = 'offboarding',
    resource_code = 'offboarding',
    action_code = 'view'
WHERE code = 'offboarding:view'
  AND (module_code IS NULL OR module_code = '');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'offboarding:edit'
WHERE r.code IN ('admin', 'hr')
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

UPDATE sys_menu
SET description = '管理离职流程、交接与状态变更'
WHERE code = 'offboarding';

-- 离职审批：组织负责人 → HR
INSERT INTO workflow_definition (code, name, version, status, definition_json, description)
SELECT
  'offboarding',
  '离职审批',
  1,
  'PUBLISHED',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT(
        'key', 'org_leader',
        'name', '组织负责人审批',
        'assigneeRule', JSON_OBJECT('type', 'ORG_LEADER')
      ),
      JSON_OBJECT(
        'key', 'hr_approve',
        'name', 'HR 审批',
        'assigneeRule', JSON_OBJECT('type', 'ROLE', 'roleCode', 'hr')
      )
    )
  ),
  '离职办理顺序审批：组织负责人 → HR（均由流程规则自动派单）'
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definition WHERE code = 'offboarding' AND version = 1
);
