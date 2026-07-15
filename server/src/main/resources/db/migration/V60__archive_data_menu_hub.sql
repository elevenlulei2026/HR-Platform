-- Slice 7.9：管理数据改为员工主数据下的单一 Mega 入口；26 项资源改由页面内导航 + 命令面板直达

-- 原 GROUP「管理数据」收成 ITEM，挂到「员工主数据」列
UPDATE sys_menu hub
INNER JOIN sys_menu emp ON emp.code = 'group_employee'
SET
  hub.code = 'archive_data',
  hub.menu_type = 'ITEM',
  hub.path = '/admin/employees/data',
  hub.parent_id = emp.id,
  hub.permission_code = NULL,
  hub.sort_order = 25,
  hub.icon = 'Database',
  hub.description = '跨员工批量维护档案子表（证件、合同、协议等）',
  hub.title = '管理数据'
WHERE hub.code = 'group_archive_data'
  AND hub.menu_type = 'GROUP';

-- 已收敛过则仅纠正 parent / path（幂等）
UPDATE sys_menu hub
INNER JOIN sys_menu emp ON emp.code = 'group_employee'
SET
  hub.parent_id = emp.id,
  hub.path = '/admin/employees/data',
  hub.menu_type = 'ITEM',
  hub.permission_code = NULL,
  hub.icon = COALESCE(hub.icon, 'Database'),
  hub.description = COALESCE(hub.description, '跨员工批量维护档案子表（证件、合同、协议等）')
WHERE hub.code = 'archive_data';

-- 隐藏 5 子 GROUP 与 26 个资源 ITEM（保留行，便于菜单管理追溯；导航树不再渲染）
UPDATE sys_menu
SET status = 'DISABLED'
WHERE status = 'ACTIVE'
  AND (
    code LIKE 'group_archive_data_%'
    OR code LIKE 'data_%'
  );
