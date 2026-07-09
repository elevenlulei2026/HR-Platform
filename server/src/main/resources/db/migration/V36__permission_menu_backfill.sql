-- 权限点菜单归属回填：V35 仅精确匹配菜单 permission_code，CRUD/档案等扩展权限需按前缀规则关联

-- 员工花名册（含档案分区、legacy 花名册权限）
UPDATE permission p
JOIN sys_menu m ON m.code = 'employee_roster' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL
  AND (
    p.code LIKE 'employee:roster:%'
    OR p.code LIKE 'employee:archive:%'
    OR p.code IN ('employee:edit', 'employee:export', 'employee:sensitive:view')
  );

-- 组织架构
UPDATE permission p
JOIN sys_menu m ON m.code = 'org_structure' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'organization:%';

-- 岗位体系
UPDATE permission p
JOIN sys_menu m ON m.code = 'org_positions' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'position:%';

-- 编制管理
UPDATE permission p
JOIN sys_menu m ON m.code = 'org_headcount' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'headcount:%';

-- 汇报关系
UPDATE permission p
JOIN sys_menu m ON m.code = 'reporting_lines' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'reporting-line:%';

-- 入职 / 异动 / 离职 / 合同
UPDATE permission p
JOIN sys_menu m ON m.code = 'onboarding' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'onboarding:%';

UPDATE permission p
JOIN sys_menu m ON m.code = 'movements' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'employee:movement:%';

UPDATE permission p
JOIN sys_menu m ON m.code = 'offboarding' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'offboarding:%';

UPDATE permission p
JOIN sys_menu m ON m.code = 'contracts' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'contract:%';

-- 流程与待办（待办须优先于流程配置匹配）
UPDATE permission p
JOIN sys_menu m ON m.code = 'tasks' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'workflow:task:%';

UPDATE permission p
JOIN sys_menu m ON m.code = 'workflow' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'workflow:%';

-- 权限 / 审计 / 设置 / 报表 / 工作台 / 运维
UPDATE permission p
JOIN sys_menu m ON m.code = 'permissions' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'permission:%';

UPDATE permission p
JOIN sys_menu m ON m.code = 'audit' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'audit:%';

UPDATE permission p
JOIN sys_menu m ON m.code = 'settings' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND (p.code LIKE 'settings:%' OR p.code = 'dict:manage');

UPDATE permission p
JOIN sys_menu m ON m.code = 'reports' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'report:%';

UPDATE permission p
JOIN sys_menu m ON m.code = 'dashboard' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'dashboard:%';

UPDATE permission p
JOIN sys_menu m ON m.code = 'dev_health' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.menu_id IS NULL AND p.code LIKE 'dev:%';
