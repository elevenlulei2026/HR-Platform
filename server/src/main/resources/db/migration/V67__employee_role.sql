-- 补齐基础员工角色（开号默认挂接）
INSERT INTO role (code, name, description, status, data_scope)
SELECT 'employee', '员工', '普通员工登录角色：默认无 Admin 管理权限，后补 ESS 时扩展', 'ACTIVE', 'SELF'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE code = 'employee');
