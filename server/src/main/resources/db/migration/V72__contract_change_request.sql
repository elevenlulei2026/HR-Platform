-- Slice 11：合同续签 / 变更单据

CREATE TABLE IF NOT EXISTS contract_change_request (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  request_no VARCHAR(64) NOT NULL,
  request_type VARCHAR(16) NOT NULL COMMENT 'RENEWAL / CHANGE',
  target_kind VARCHAR(16) NOT NULL COMMENT 'CONTRACT / AGREEMENT',
  employee_id BIGINT NOT NULL,
  source_record_id BIGINT NOT NULL COMMENT 'employee_contract.id 或 employee_agreement.id',
  proposed_start_date DATE NOT NULL,
  proposed_end_date DATE NULL,
  proposed_effective_start_date DATE NULL,
  legal_entity_id BIGINT NULL,
  contract_category VARCHAR(64) NULL,
  contract_category_desc VARCHAR(64) NULL,
  contract_code VARCHAR(64) NULL,
  agreement_category VARCHAR(64) NULL,
  agreement_code VARCHAR(64) NULL,
  file_attachment_id BIGINT NULL,
  opinion VARCHAR(512) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  workflow_instance_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_contract_change_request_no (request_no),
  KEY idx_ccr_type (request_type),
  KEY idx_ccr_target (target_kind),
  KEY idx_ccr_employee (employee_id),
  KEY idx_ccr_source (source_record_id),
  KEY idx_ccr_status (status),
  KEY idx_ccr_workflow (workflow_instance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key, status)
SELECT 'CONTRACT_CHANGE_REQUEST_NO', '合同变更单据号', 'CC-{yyyy}{MM}{dd}-{seq}', 'DAY', 1, 4, 0, NULL, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code = 'CONTRACT_CHANGE_REQUEST_NO');

-- 合同管理编辑权限
INSERT INTO permission (code, name, description, status)
SELECT 'contract:edit', '合同管理编辑', '发起/编辑/提交/取消合同续签与变更单据', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'contract:edit');

UPDATE permission p
JOIN sys_menu m ON m.code = 'contracts' AND m.status = 'ACTIVE'
SET p.menu_id = m.id,
    p.module_code = 'contract',
    p.resource_code = 'contract',
    p.action_code = 'edit'
WHERE p.code = 'contract:edit';

UPDATE permission
SET module_code = 'contract',
    resource_code = 'contract',
    action_code = 'view'
WHERE code = 'contract:view'
  AND (module_code IS NULL OR module_code = '');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'contract:edit'
WHERE r.code IN ('admin', 'hr')
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

UPDATE sys_menu
SET description = '合同续签、变更审批与到期提醒'
WHERE code = 'contracts';

-- 合同续签：直属上级 → HR
INSERT INTO workflow_definition (code, name, version, status, definition_json, description)
SELECT
  'contract_renewal',
  '合同续签审批',
  1,
  'PUBLISHED',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT(
        'key', 'direct_manager',
        'name', '上级审批',
        'assigneeRule', JSON_OBJECT('type', 'DIRECT_MANAGER')
      ),
      JSON_OBJECT(
        'key', 'hr_approve',
        'name', 'HR 审批',
        'assigneeRule', JSON_OBJECT('type', 'ROLE', 'roleCode', 'hr')
      )
    )
  ),
  '合同/协议续签顺序审批：直属上级 → HR'
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definition WHERE code = 'contract_renewal' AND version = 1
);

-- 合同变更：直属上级 → HR
INSERT INTO workflow_definition (code, name, version, status, definition_json, description)
SELECT
  'contract_change',
  '合同变更审批',
  1,
  'PUBLISHED',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT(
        'key', 'direct_manager',
        'name', '上级审批',
        'assigneeRule', JSON_OBJECT('type', 'DIRECT_MANAGER')
      ),
      JSON_OBJECT(
        'key', 'hr_approve',
        'name', 'HR 审批',
        'assigneeRule', JSON_OBJECT('type', 'ROLE', 'roleCode', 'hr')
      )
    )
  ),
  '合同/协议变更顺序审批：直属上级 → HR'
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definition WHERE code = 'contract_change' AND version = 1
);
