-- 菜单「组织架构」更名为「组织管理」，并同步权限点展示名
UPDATE sys_menu
SET title = '组织管理',
    description = '维护组织层级、关键属性与历史快照'
WHERE code = 'org_structure';

UPDATE permission
SET name = '组织管理查看',
    description = '查看组织管理与历史快照'
WHERE code = 'organization:view';

UPDATE permission
SET name = '组织管理维护'
WHERE code = 'organization:edit';

UPDATE permission
SET name = '组织管理新建'
WHERE code = 'organization:create';

UPDATE permission
SET name = '组织管理删除'
WHERE code = 'organization:delete';
