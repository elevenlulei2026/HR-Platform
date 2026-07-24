-- Slice 9：转正 regularization_request

CREATE TABLE IF NOT EXISTS regularization_request (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  request_no VARCHAR(64) NOT NULL,
  employee_id BIGINT NOT NULL,
  assignment_id BIGINT NOT NULL,
  expected_regularization_date DATE NULL,
  actual_regularization_date DATE NOT NULL,
  reason_code VARCHAR(16) NOT NULL,
  opinion VARCHAR(512) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  workflow_instance_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_regularization_request_no (request_no),
  KEY idx_regularization_employee (employee_id),
  KEY idx_regularization_assignment (assignment_id),
  KEY idx_regularization_status (status),
  KEY idx_regularization_workflow (workflow_instance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 转正单据号：RG-{yyyy}{MM}{dd}-{seq}
INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key, status)
SELECT 'REGULARIZATION_REQUEST_NO', '转正单据号', 'RG-{yyyy}{MM}{dd}-{seq}', 'DAY', 1, 4, 0, NULL, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code = 'REGULARIZATION_REQUEST_NO');

-- 人事异动编辑权限（转正发起/编辑/提交/取消）
INSERT INTO permission (code, name, description, status)
SELECT 'employee:movement:edit', '人事异动编辑', '发起/编辑/提交/取消转正等人事异动单据', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:movement:edit');

UPDATE permission p
JOIN sys_menu m ON m.code = 'movements' AND m.status = 'ACTIVE'
SET p.menu_id = m.id,
    p.module_code = 'employee',
    p.resource_code = 'movement',
    p.action_code = 'edit'
WHERE p.code = 'employee:movement:edit';

UPDATE permission
SET module_code = 'employee',
    resource_code = 'movement',
    action_code = 'view'
WHERE code = 'employee:movement:view'
  AND (module_code IS NULL OR module_code = '');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'employee:movement:edit'
WHERE r.code IN ('admin', 'hr')
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

UPDATE sys_menu
SET description = '办理试用期转正、转岗调动等员工任职变更'
WHERE code = 'movements';

-- 转正流程定义：组织负责人 → HR
INSERT INTO workflow_definition (code, name, version, status, definition_json, description)
SELECT
  'regularization',
  '转正审批',
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
  '转正办理顺序审批：组织负责人 → HR（均由流程规则自动派单）'
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definition WHERE code = 'regularization' AND version = 1
);
