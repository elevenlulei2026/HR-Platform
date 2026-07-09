-- RBAC 增强：菜单管理、权限元数据、角色自定义组织范围

CREATE TABLE IF NOT EXISTS sys_menu (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  parent_id BIGINT NULL,
  code VARCHAR(64) NOT NULL,
  title VARCHAR(128) NOT NULL,
  path VARCHAR(255) NULL,
  icon VARCHAR(64) NULL,
  menu_type VARCHAR(16) NOT NULL DEFAULT 'ITEM',
  permission_code VARCHAR(128) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_sys_menu_code (code),
  KEY idx_sys_menu_parent (parent_id),
  KEY idx_sys_menu_status (status),
  KEY idx_sys_menu_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_org_scope (
  role_id BIGINT NOT NULL,
  organization_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, organization_id),
  KEY idx_ros_org (organization_id),
  CONSTRAINT fk_ros_role FOREIGN KEY (role_id) REFERENCES role(id),
  CONSTRAINT fk_ros_org FOREIGN KEY (organization_id) REFERENCES organization(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE permission
  ADD COLUMN menu_id BIGINT NULL AFTER status,
  ADD COLUMN module_code VARCHAR(64) NULL AFTER menu_id,
  ADD COLUMN resource_code VARCHAR(64) NULL AFTER module_code,
  ADD COLUMN action_code VARCHAR(32) NULL AFTER resource_code,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER action_code;

ALTER TABLE permission
  ADD KEY idx_permission_menu (menu_id),
  ADD KEY idx_permission_module (module_code);

-- 菜单种子（与当前 Admin 导航对齐）
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'dashboard', '工作台', '/admin/dashboard', 'LayoutDashboard', 'ITEM', 'dashboard:view', 10, NULL
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'dashboard');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'mega_org_employee', '组织与员工', NULL, 'Building2', 'MEGA', NULL, 20, NULL
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'mega_org_employee');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_org_position', '组织岗位', NULL, NULL, 'GROUP', NULL, 10, m.id
FROM sys_menu m WHERE m.code = 'mega_org_employee'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_org_position');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'org_structure', '组织架构', '/admin/org/structure', 'Building2', 'ITEM', 'organization:view', 10, g.id, '组织树与历史快照'
FROM sys_menu g WHERE g.code = 'group_org_position'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'org_structure');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'org_positions', '岗位体系', '/admin/org/positions', 'BriefcaseBusiness', 'ITEM', 'position:view', 20, g.id, '岗位主数据维护'
FROM sys_menu g WHERE g.code = 'group_org_position'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'org_positions');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'org_headcount', '编制管理', '/admin/org/headcount', 'Settings2', 'ITEM', 'headcount:view', 30, g.id, '编制计划与使用率'
FROM sys_menu g WHERE g.code = 'group_org_position'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'org_headcount');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_employee', '员工主数据', NULL, NULL, 'GROUP', NULL, 20, m.id
FROM sys_menu m WHERE m.code = 'mega_org_employee'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_employee');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'employee_roster', '员工花名册', '/admin/employees/roster', 'ClipboardList', 'ITEM', 'employee:roster:view', 10, g.id, '花名册与档案'
FROM sys_menu g WHERE g.code = 'group_employee'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'employee_roster');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'reporting_lines', '汇报关系', '/admin/employees/reporting-lines', 'ShieldCheck', 'ITEM', 'reporting-line:view', 20, g.id
FROM sys_menu g WHERE g.code = 'group_employee'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'reporting_lines');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_lifecycle', '入转调离', NULL, NULL, 'GROUP', NULL, 30, m.id
FROM sys_menu m WHERE m.code = 'mega_org_employee'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_lifecycle');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'onboarding', '入职办理', '/admin/onboarding', 'LifeBuoy', 'ITEM', 'onboarding:view', 10, g.id
FROM sys_menu g WHERE g.code = 'group_lifecycle'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'onboarding');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'movements', '人事异动', '/admin/movements', 'LifeBuoy', 'ITEM', 'employee:movement:view', 20, g.id
FROM sys_menu g WHERE g.code = 'group_lifecycle'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'movements');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'offboarding', '离职办理', '/admin/offboarding', 'LifeBuoy', 'ITEM', 'offboarding:view', 30, g.id
FROM sys_menu g WHERE g.code = 'group_lifecycle'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'offboarding');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'contracts', '合同管理', '/admin/contracts', 'LifeBuoy', 'ITEM', 'contract:view', 40, g.id
FROM sys_menu g WHERE g.code = 'group_lifecycle'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'contracts');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'mega_platform', '平台', NULL, 'Shield', 'MEGA', NULL, 30, NULL
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'mega_platform');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_workflow', '协同流程', NULL, NULL, 'GROUP', NULL, 10, m.id
FROM sys_menu m WHERE m.code = 'mega_platform'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_workflow');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'workflow', '流程配置', '/admin/platform/workflow', 'Workflow', 'ITEM', 'workflow:manage', 10, g.id
FROM sys_menu g WHERE g.code = 'group_workflow'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'workflow');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'tasks', '待办中心', '/admin/platform/tasks', 'ClipboardList', 'ITEM', 'workflow:task:view', 20, g.id
FROM sys_menu g WHERE g.code = 'group_workflow'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'tasks');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_rbac', '权限与审计', NULL, NULL, 'GROUP', NULL, 20, m.id
FROM sys_menu m WHERE m.code = 'mega_platform'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_rbac');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'permissions', '权限中心', '/admin/platform/permissions', 'Shield', 'ITEM', 'permission:manage', 10, g.id
FROM sys_menu g WHERE g.code = 'group_rbac'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'permissions');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'audit', '审计日志', '/admin/platform/audit', 'ShieldCheck', 'ITEM', 'audit:view', 20, g.id
FROM sys_menu g WHERE g.code = 'group_rbac'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'audit');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_devops', '开发与运维', NULL, NULL, 'GROUP', NULL, 30, m.id
FROM sys_menu m WHERE m.code = 'mega_platform'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_devops');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'dev_health', '健康检查', '/admin/dev/health', 'Cog', 'ITEM', 'dev:health:view', 10, g.id
FROM sys_menu g WHERE g.code = 'group_devops'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'dev_health');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'reports', '报表', '/admin/reports', 'BarChart3', 'ITEM', 'report:view', 40, NULL
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'reports');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'settings', '设置', '/admin/settings', 'Cog', 'ITEM', 'settings:view', 50, NULL
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'settings');

-- 权限点关联菜单（按 code 前缀与菜单 permission 匹配）
UPDATE permission p
JOIN sys_menu m ON m.permission_code = p.code AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL;

UPDATE permission SET module_code = SUBSTRING_INDEX(code, ':', 1)
WHERE module_code IS NULL OR module_code = '';

UPDATE permission SET action_code = SUBSTRING_INDEX(code, ':', -1)
WHERE action_code IS NULL OR action_code = '';

UPDATE permission SET resource_code = CASE
  WHEN code LIKE '%:%:%' THEN SUBSTRING_INDEX(SUBSTRING_INDEX(code, ':', 2), ':', -1)
  WHEN code LIKE '%:%' THEN SUBSTRING_INDEX(code, ':', -1)
  ELSE code
END
WHERE resource_code IS NULL OR resource_code = '';
