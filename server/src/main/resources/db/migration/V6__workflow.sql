-- Slice 4：流程引擎（最小可用）

-- 直属上级解析（员工/汇报关系模块补齐前，用用户表字段占位）
ALTER TABLE sys_user
  ADD COLUMN manager_user_id BIGINT NULL AFTER employee_id,
  ADD KEY idx_sys_user_manager_user_id (manager_user_id);

CREATE TABLE IF NOT EXISTS workflow_definition (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  definition_json JSON NOT NULL,
  description VARCHAR(255) NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_workflow_definition_code_version (code, version),
  KEY idx_workflow_definition_status (status),
  KEY idx_workflow_definition_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workflow_instance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  definition_id BIGINT NOT NULL,
  definition_code VARCHAR(64) NOT NULL,
  definition_name VARCHAR(128) NOT NULL,
  business_type VARCHAR(64) NOT NULL,
  business_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'RUNNING',
  initiator_user_id BIGINT NOT NULL,
  current_node_index INT NOT NULL DEFAULT 0,
  context_json JSON NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_workflow_instance_business (business_type, business_id),
  KEY idx_workflow_instance_initiator (initiator_user_id),
  KEY idx_workflow_instance_status (status),
  CONSTRAINT fk_workflow_instance_definition_id FOREIGN KEY (definition_id) REFERENCES workflow_definition(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workflow_task (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  instance_id BIGINT NOT NULL,
  node_key VARCHAR(64) NOT NULL,
  node_name VARCHAR(128) NOT NULL,
  assignee_user_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  comment VARCHAR(512) NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_workflow_task_instance_id (instance_id),
  KEY idx_workflow_task_assignee_status (assignee_user_id, status),
  CONSTRAINT fk_workflow_task_instance_id FOREIGN KEY (instance_id) REFERENCES workflow_instance(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 演示账号：manager / hr / employee（密码均为 admin123）
INSERT INTO sys_user (username, password_hash, status)
SELECT 'manager', CONCAT('sha256:', SHA2('admin123', 256)), 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'manager');

INSERT INTO sys_user (username, password_hash, status)
SELECT 'hr', CONCAT('sha256:', SHA2('admin123', 256)), 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'hr');

INSERT INTO sys_user (username, password_hash, status)
SELECT 'employee', CONCAT('sha256:', SHA2('admin123', 256)), 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'employee');

-- employee -> manager -> admin（admin 作为顶级审批人）
UPDATE sys_user e
JOIN sys_user m ON m.username = 'manager'
SET e.manager_user_id = m.id
WHERE e.username = 'employee';

UPDATE sys_user m
JOIN sys_user a ON a.username = 'admin'
SET m.manager_user_id = a.id
WHERE m.username = 'manager';

-- HR 角色
INSERT INTO role (code, name, description, status, data_scope)
SELECT 'hr', 'HR', '人事角色：处理 HR 审批节点', 'ACTIVE', 'ALL'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE code = 'hr');

INSERT INTO role (code, name, description, status, data_scope)
SELECT 'manager', '直属主管', '部门主管角色', 'ACTIVE', 'DEPARTMENT'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE code = 'manager');

-- 绑定演示用户角色
INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN role r ON r.code = 'hr'
WHERE u.username = 'hr'
  AND NOT EXISTS (SELECT 1 FROM user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN role r ON r.code = 'manager'
WHERE u.username = 'manager'
  AND NOT EXISTS (SELECT 1 FROM user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN role r ON r.code = 'admin'
WHERE u.username IN ('admin', 'manager')
  AND NOT EXISTS (SELECT 1 FROM user_role ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- HR 角色权限：待办查看
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN ('workflow:task:view', 'onboarding:view')
WHERE r.code = 'hr'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'workflow:task:view'
WHERE r.code = 'manager'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 入职流程定义种子（DRAFT，可在管理端发布）
INSERT INTO workflow_definition (code, name, version, status, definition_json, description)
SELECT
  'onboarding',
  '入职审批',
  1,
  'DRAFT',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT(
        'key', 'manager_approve',
        'name', '直属上级审批',
        'assigneeRule', JSON_OBJECT('type', 'DIRECT_MANAGER')
      ),
      JSON_OBJECT(
        'key', 'hr_approve',
        'name', 'HR 审批',
        'assigneeRule', JSON_OBJECT('type', 'ROLE', 'roleCode', 'hr')
      ),
      JSON_OBJECT(
        'key', 'final_approve',
        'name', '指定审批人',
        'assigneeRule', JSON_OBJECT('type', 'INITIATOR_SELECT')
      )
    )
  ),
  '入职办理顺序审批：直属上级 → HR → 发起人自选'
WHERE NOT EXISTS (SELECT 1 FROM workflow_definition WHERE code = 'onboarding' AND version = 1);
