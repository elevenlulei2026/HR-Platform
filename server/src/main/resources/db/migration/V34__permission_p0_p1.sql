-- P0/P1：菜单权限补齐、CRUD 细粒度、档案分区权限

-- 菜单与报表
INSERT INTO permission (code, name, description, status)
SELECT 'dashboard:view', '工作台查看', '访问 Admin 工作台', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'dashboard:view');

INSERT INTO permission (code, name, description, status)
SELECT 'report:view', '报表查看', '访问报表概览', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'report:view');

INSERT INTO permission (code, name, description, status)
SELECT 'report:export', '报表导出', '导出报表并写审计', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'report:export');

INSERT INTO permission (code, name, description, status)
SELECT 'settings:view', '系统设置查看', '访问字典、编码规则等设置', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'settings:view');

INSERT INTO permission (code, name, description, status)
SELECT 'dev:health:view', '健康检查查看', '访问开发运维健康检查页', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'dev:health:view');

-- 花名册 CRUD 细粒度（兼容 legacy employee:edit）
INSERT INTO permission (code, name, description, status)
SELECT 'employee:roster:create', '花名册新建', '新建员工主档', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:roster:create');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:roster:edit', '花名册编辑', '编辑员工主档与任职', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:roster:edit');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:roster:delete', '花名册删除', '删除员工主档', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:roster:delete');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:roster:import', '花名册导入', 'Excel 批量导入员工', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:roster:import');

-- 组织 / 岗位 / 编制 CRUD 细粒度
INSERT INTO permission (code, name, description, status)
SELECT 'organization:create', '组织架构新建', '新建组织节点', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'organization:create');

INSERT INTO permission (code, name, description, status)
SELECT 'organization:delete', '组织架构删除', '删除组织节点', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'organization:delete');

INSERT INTO permission (code, name, description, status)
SELECT 'position:create', '岗位体系新建', '新建岗位/职务/职级', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'position:create');

INSERT INTO permission (code, name, description, status)
SELECT 'position:delete', '岗位体系删除', '删除岗位/职务/职级', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'position:delete');

INSERT INTO permission (code, name, description, status)
SELECT 'headcount:create', '编制管理新建', '新建编制计划', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'headcount:create');

INSERT INTO permission (code, name, description, status)
SELECT 'headcount:delete', '编制管理删除', '删除编制计划', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'headcount:delete');

INSERT INTO permission (code, name, description, status)
SELECT 'reporting-line:create', '汇报关系新建', '新建汇报关系', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'reporting-line:create');

INSERT INTO permission (code, name, description, status)
SELECT 'reporting-line:delete', '汇报关系删除', '删除汇报关系', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'reporting-line:delete');

-- 档案分区权限（5 区 × view/create/edit/delete）
INSERT INTO permission (code, name, description, status)
SELECT CONCAT('employee:archive:', s.section, ':', s.action) AS code,
       CONCAT('档案-', s.section_label, '-', s.action_label) AS name,
       CONCAT('员工档案 ', s.section_label, ' ', s.action_label) AS description,
       'ACTIVE'
FROM (
  SELECT 'personal' AS section, '个人信息' AS section_label, 'view' AS action, '查看' AS action_label
  UNION ALL SELECT 'personal', '个人信息', 'create', '新建'
  UNION ALL SELECT 'personal', '个人信息', 'edit', '编辑'
  UNION ALL SELECT 'personal', '个人信息', 'delete', '删除'
  UNION ALL SELECT 'work', '工作信息', 'view', '查看'
  UNION ALL SELECT 'work', '工作信息', 'create', '新建'
  UNION ALL SELECT 'work', '工作信息', 'edit', '编辑'
  UNION ALL SELECT 'work', '工作信息', 'delete', '删除'
  UNION ALL SELECT 'service', '员工服务', 'view', '查看'
  UNION ALL SELECT 'service', '员工服务', 'create', '新建'
  UNION ALL SELECT 'service', '员工服务', 'edit', '编辑'
  UNION ALL SELECT 'service', '员工服务', 'delete', '删除'
  UNION ALL SELECT 'background', '背景信息', 'view', '查看'
  UNION ALL SELECT 'background', '背景信息', 'create', '新建'
  UNION ALL SELECT 'background', '背景信息', 'edit', '编辑'
  UNION ALL SELECT 'background', '背景信息', 'delete', '删除'
  UNION ALL SELECT 'development', '人才发展', 'view', '查看'
  UNION ALL SELECT 'development', '人才发展', 'create', '新建'
  UNION ALL SELECT 'development', '人才发展', 'edit', '编辑'
  UNION ALL SELECT 'development', '人才发展', 'delete', '删除'
) s
WHERE NOT EXISTS (
  SELECT 1 FROM permission p
  WHERE p.code = CONCAT('employee:archive:', s.section, ':', s.action)
);

-- admin 绑定全部新权限点
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'dashboard:view', 'report:view', 'report:export', 'settings:view', 'dev:health:view',
  'employee:roster:create', 'employee:roster:edit', 'employee:roster:delete', 'employee:roster:import',
  'organization:create', 'organization:delete',
  'position:create', 'position:delete',
  'headcount:create', 'headcount:delete',
  'reporting-line:create', 'reporting-line:delete'
)
OR p.code LIKE 'employee:archive:%'
WHERE r.code = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- hr 角色：菜单 + 花名册 + 档案全部分区
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'dashboard:view', 'report:view', 'settings:view',
  'employee:roster:create', 'employee:roster:edit', 'employee:roster:delete', 'employee:roster:import'
)
OR p.code LIKE 'employee:archive:%'
WHERE r.code = 'hr'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- manager：工作台 + 花名册查看 + 档案个人信息查看
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'dashboard:view',
  'employee:archive:personal:view',
  'employee:archive:work:view'
)
WHERE r.code = 'manager'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
