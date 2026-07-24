-- Slice 9 扩展：职务异动单据（晋升晋级 PRO / 降职降级 DEM / 雇佣类型变更 SPR）

CREATE TABLE IF NOT EXISTS job_movement_request (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  request_no VARCHAR(64) NOT NULL,
  movement_type VARCHAR(8) NOT NULL COMMENT 'PRO / DEM / SPR',
  employee_id BIGINT NOT NULL,
  from_assignment_id BIGINT NOT NULL,
  to_assignment_id BIGINT NULL,
  effective_date DATE NOT NULL,
  reason_code VARCHAR(32) NOT NULL,
  reason_sub_code VARCHAR(32) NULL,
  organization_id BIGINT NULL,
  position_id BIGINT NULL,
  job_grade_code VARCHAR(64) NULL,
  employee_group_code VARCHAR(64) NULL,
  employee_subgroup_code VARCHAR(64) NULL,
  opinion VARCHAR(512) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  workflow_instance_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_job_movement_request_no (request_no),
  KEY idx_job_movement_type (movement_type),
  KEY idx_job_movement_employee (employee_id),
  KEY idx_job_movement_status (status),
  KEY idx_job_movement_workflow (workflow_instance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO code_rule (code, name, pattern, seq_reset, seq_start, seq_length, last_seq, last_reset_key, status)
SELECT 'JOB_MOVEMENT_REQUEST_NO', '职务异动单据号', 'JM-{yyyy}{MM}{dd}-{seq}', 'DAY', 1, 4, 0, NULL, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM code_rule WHERE code = 'JOB_MOVEMENT_REQUEST_NO');

UPDATE sys_menu
SET description = '办理转正、晋升晋级、降职降级、雇佣类型变更等职务异动'
WHERE code = 'movements';

-- 晋升晋级：直属上级 → HRBP
INSERT INTO workflow_definition (code, name, version, status, definition_json, description)
SELECT
  'promotion',
  '晋升晋级审批',
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
        'key', 'hrbp_approve',
        'name', 'HRBP 审批',
        'assigneeRule', JSON_OBJECT('type', 'ORG_HRBP')
      )
    )
  ),
  '晋升晋级顺序审批：直属上级 → HRBP'
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definition WHERE code = 'promotion' AND version = 1
);

-- 降职降级：直属上级 → HRBP
INSERT INTO workflow_definition (code, name, version, status, definition_json, description)
SELECT
  'demotion',
  '降职降级审批',
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
        'key', 'hrbp_approve',
        'name', 'HRBP 审批',
        'assigneeRule', JSON_OBJECT('type', 'ORG_HRBP')
      )
    )
  ),
  '降职降级顺序审批：直属上级 → HRBP'
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definition WHERE code = 'demotion' AND version = 1
);

-- 雇佣类型变更：直属上级 → HRBP
INSERT INTO workflow_definition (code, name, version, status, definition_json, description)
SELECT
  'employment_type_change',
  '雇佣类型变更审批',
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
        'key', 'hrbp_approve',
        'name', 'HRBP 审批',
        'assigneeRule', JSON_OBJECT('type', 'ORG_HRBP')
      )
    )
  ),
  '雇佣类型变更顺序审批：直属上级 → HRBP'
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definition WHERE code = 'employment_type_change' AND version = 1
);
