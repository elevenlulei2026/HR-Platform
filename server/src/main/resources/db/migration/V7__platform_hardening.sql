-- 平台底座加固：权限点补齐、编码规则状态字段

INSERT INTO permission (code, name, description, status)
SELECT 'dict:manage', '字典与编码管理', '维护字典类型/项与编码规则', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'dict:manage');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'dict:manage'
WHERE r.code = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 编码规则增加状态字段（软删除）
ALTER TABLE code_rule
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' AFTER seq_length;

UPDATE code_rule SET status = 'ACTIVE' WHERE status IS NULL OR status = '';
