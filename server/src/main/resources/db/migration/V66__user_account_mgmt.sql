-- 账号管理底座：sys_user 增强、唯一约束、AD 长度对齐、权限与菜单

-- 1) sys_user 增列
ALTER TABLE sys_user
  ADD COLUMN display_name VARCHAR(64) NULL AFTER password_hash,
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN password_updated_at DATETIME NULL AFTER must_change_password,
  ADD COLUMN locked_until DATETIME NULL AFTER password_updated_at;

-- 2) 唯一索引：一员工一账号；列表筛选
ALTER TABLE sys_user
  ADD UNIQUE KEY uk_sys_user_employee_id (employee_id),
  ADD KEY idx_sys_user_status (status);

-- 3) employee.user_id 唯一
ALTER TABLE employee
  ADD UNIQUE KEY uk_employee_user_id (user_id);

-- 4) AD 与 username 长度对齐为 64（超长演示数据截断）
UPDATE employee
SET ad_account = LEFT(ad_account, 64)
WHERE ad_account IS NOT NULL AND CHAR_LENGTH(ad_account) > 64;

UPDATE employee_master_version
SET ad_account = LEFT(ad_account, 64)
WHERE ad_account IS NOT NULL AND CHAR_LENGTH(ad_account) > 64;

ALTER TABLE employee
  MODIFY COLUMN ad_account VARCHAR(64) NULL;

ALTER TABLE employee_master_version
  MODIFY COLUMN ad_account VARCHAR(64) NULL;

-- 5) 权限点 user:manage
INSERT INTO permission (code, name, description, status)
SELECT 'user:manage', '账号管理', '平台登录账号的创建、启停、重置密码、角色挂接与开号', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'user:manage');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'user:manage'
WHERE r.code = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 6) 菜单：账号管理
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'users', '账号管理', '/admin/platform/users', 'Users', 'ITEM', 'user:manage', 5, g.id,
       '管理系统登录账号、启停、重置密码与角色挂接'
FROM sys_menu g WHERE g.code = 'group_rbac'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'users');
