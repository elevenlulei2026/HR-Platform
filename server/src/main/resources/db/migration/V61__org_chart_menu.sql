-- 组织图：独立菜单入口（复用 organization:view）
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'org_chart', '组织图', '/admin/org/chart', 'Network', 'ITEM', 'organization:view', 15, g.id,
       '图形化浏览组织层级，下钻查看部门岗位与人员'
FROM sys_menu g WHERE g.code = 'group_org_position'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'org_chart');
