-- Slice 7.9：档案数据批管菜单（管理数据 + 5 子 GROUP）与分区 import/export 权限

-- ========== 分区 import / export 权限 ==========
INSERT INTO permission (code, name, description, status)
SELECT CONCAT('employee:archive:', s.section, ':', s.action) AS code,
       CONCAT('档案-', s.section_label, '-', s.action_label) AS name,
       CONCAT('员工档案 ', s.section_label, ' ', s.action_label) AS description,
       'ACTIVE'
FROM (
  SELECT 'personal' AS section, '个人信息' AS section_label, 'import' AS action, '导入' AS action_label
  UNION ALL SELECT 'personal', '个人信息', 'export', '导出'
  UNION ALL SELECT 'work', '工作信息', 'import', '导入'
  UNION ALL SELECT 'work', '工作信息', 'export', '导出'
  UNION ALL SELECT 'service', '员工服务', 'import', '导入'
  UNION ALL SELECT 'service', '员工服务', 'export', '导出'
  UNION ALL SELECT 'background', '背景信息', 'import', '导入'
  UNION ALL SELECT 'background', '背景信息', 'export', '导出'
  UNION ALL SELECT 'development', '人才发展', 'import', '导入'
  UNION ALL SELECT 'development', '人才发展', 'export', '导出'
) s
WHERE NOT EXISTS (
  SELECT 1 FROM permission p
  WHERE p.code = CONCAT('employee:archive:', s.section, ':', s.action)
);

UPDATE permission
SET module_code = 'employee',
    resource_code = CONCAT('archive:', SUBSTRING_INDEX(SUBSTRING_INDEX(code, ':', 3), ':', -1)),
    action_code = SUBSTRING_INDEX(code, ':', -1)
WHERE code LIKE 'employee:archive:%:import'
   OR code LIKE 'employee:archive:%:export';

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code LIKE 'employee:archive:%:import'
   OR p.code LIKE 'employee:archive:%:export'
WHERE r.code IN ('admin', 'hr')
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ========== 管理数据 GROUP（夹在员工主数据与入转调离之间） ==========
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'group_archive_data', '管理数据', NULL, 'Database', 'GROUP', NULL, 25, m.id,
       '跨员工批量维护档案二级模块数据'
FROM sys_menu m WHERE m.code = 'mega_org_employee'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_archive_data');

-- 5 子 GROUP（嵌套于管理数据下；Mega 渲染为分区）
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_archive_data_personal', '个人信息', NULL, NULL, 'GROUP', NULL, 10, g.id
FROM sys_menu g WHERE g.code = 'group_archive_data'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_archive_data_personal');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_archive_data_work', '工作信息', NULL, NULL, 'GROUP', NULL, 20, g.id
FROM sys_menu g WHERE g.code = 'group_archive_data'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_archive_data_work');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_archive_data_service', '员工服务', NULL, NULL, 'GROUP', NULL, 30, g.id
FROM sys_menu g WHERE g.code = 'group_archive_data'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_archive_data_service');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_archive_data_background', '背景信息', NULL, NULL, 'GROUP', NULL, 40, g.id
FROM sys_menu g WHERE g.code = 'group_archive_data'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_archive_data_background');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id)
SELECT 'group_archive_data_development', '人才发展', NULL, NULL, 'GROUP', NULL, 50, g.id
FROM sys_menu g WHERE g.code = 'group_archive_data'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'group_archive_data_development');

-- ========== 个人信息 ==========
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_id_documents', '证件信息', '/admin/employees/data/id-documents', 'IdCard', 'ITEM',
       'employee:archive:personal:view', 10, g.id, '跨员工证件信息批管（试点）'
FROM sys_menu g WHERE g.code = 'group_archive_data_personal'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_id_documents');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_family_members', '家庭成员', '/admin/employees/data/family-members', 'Users', 'ITEM',
       'employee:archive:personal:view', 20, g.id, '跨员工家庭成员批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_personal'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_family_members');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_internal_relatives', '内部亲属', '/admin/employees/data/internal-relatives', 'UserRound', 'ITEM',
       'employee:archive:personal:view', 30, g.id, '跨员工内部亲属批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_personal'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_internal_relatives');

-- ========== 工作信息 ==========
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_cost_centers', '成本中心', '/admin/employees/data/cost-center-allocations', 'PieChart', 'ITEM',
       'employee:archive:work:view', 10, g.id, '跨员工成本中心分摊批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_work'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_cost_centers');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_contracts_info', '合同信息', '/admin/employees/data/contracts', 'FileText', 'ITEM',
       'employee:archive:service:view', 20, g.id, '跨员工合同档案批管（非续签流程）'
FROM sys_menu g WHERE g.code = 'group_archive_data_work'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_contracts_info');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_agreements_info', '协议信息', '/admin/employees/data/agreements', 'ScrollText', 'ITEM',
       'employee:archive:service:view', 30, g.id, '跨员工协议档案批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_work'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_agreements_info');

-- ========== 员工服务 ==========
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_attendance_cards', '考勤卡', '/admin/employees/data/attendance-cards', 'CreditCard', 'ITEM',
       'employee:archive:service:view', 10, g.id, '跨员工考勤卡批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_service'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_attendance_cards');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_bank_accounts', '银行卡', '/admin/employees/data/bank-accounts', 'Landmark', 'ITEM',
       'employee:archive:service:view', 20, g.id, '跨员工银行卡批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_service'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_bank_accounts');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_social_insurances', '社保公积金', '/admin/employees/data/social-insurances', 'Shield', 'ITEM',
       'employee:archive:service:view', 30, g.id, '跨员工社保公积金批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_service'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_social_insurances');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_special_benefits', '特殊福利', '/admin/employees/data/special-benefits', 'Gift', 'ITEM',
       'employee:archive:service:view', 40, g.id, '跨员工特殊福利批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_service'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_special_benefits');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_work_injuries', '工伤信息', '/admin/employees/data/work-injuries', 'HeartPulse', 'ITEM',
       'employee:archive:service:view', 50, g.id, '跨员工工伤信息批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_service'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_work_injuries');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_admin_infos', '行政信息', '/admin/employees/data/admin-infos', 'Building', 'ITEM',
       'employee:archive:service:view', 60, g.id, '跨员工行政信息批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_service'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_admin_infos');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_accommodations', '住宿信息', '/admin/employees/data/accommodations', 'Home', 'ITEM',
       'employee:archive:service:view', 70, g.id, '跨员工住宿信息批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_service'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_accommodations');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_attachments', '附件', '/admin/employees/data/attachments', 'Paperclip', 'ITEM',
       'employee:archive:service:view', 80, g.id, '跨员工附件批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_service'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_attachments');

-- ========== 背景信息 ==========
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_educations', '教育经历', '/admin/employees/data/educations', 'GraduationCap', 'ITEM',
       'employee:archive:background:view', 10, g.id, '跨员工教育经历批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_background'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_educations');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_work_experiences', '工作经历', '/admin/employees/data/work-experiences', 'Briefcase', 'ITEM',
       'employee:archive:background:view', 20, g.id, '跨员工工作经历批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_background'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_work_experiences');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_qualifications', '资格证书', '/admin/employees/data/qualifications', 'Award', 'ITEM',
       'employee:archive:background:view', 30, g.id, '跨员工资格证书批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_background'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_qualifications');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_title_certificates', '职称证书', '/admin/employees/data/title-certificates', 'BadgeCheck', 'ITEM',
       'employee:archive:background:view', 40, g.id, '跨员工职称证书批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_background'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_title_certificates');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_rewards', '奖励记录', '/admin/employees/data/rewards', 'Trophy', 'ITEM',
       'employee:archive:background:view', 50, g.id, '跨员工奖励记录批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_background'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_rewards');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_penalties', '惩处记录', '/admin/employees/data/penalties', 'AlertTriangle', 'ITEM',
       'employee:archive:background:view', 60, g.id, '跨员工惩处记录批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_background'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_penalties');

-- ========== 人才发展 ==========
INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_training_records', '培训记录', '/admin/employees/data/training-records', 'BookOpen', 'ITEM',
       'employee:archive:development:view', 10, g.id, '跨员工培训记录批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_development'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_training_records');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_performance_records', '绩效记录', '/admin/employees/data/performance-records', 'LineChart', 'ITEM',
       'employee:archive:development:view', 20, g.id, '跨员工绩效记录批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_development'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_performance_records');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_values_assessments', '价值观评估', '/admin/employees/data/values-assessments', 'Sparkles', 'ITEM',
       'employee:archive:development:view', 30, g.id, '跨员工价值观评估批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_development'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_values_assessments');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_talent_reviews', '人才盘点', '/admin/employees/data/talent-reviews', 'LayoutGrid', 'ITEM',
       'employee:archive:development:view', 40, g.id, '跨员工人才盘点批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_development'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_talent_reviews');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_projects', '项目信息', '/admin/employees/data/projects', 'FolderKanban', 'ITEM',
       'employee:archive:development:view', 50, g.id, '跨员工项目信息批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_development'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_projects');

INSERT INTO sys_menu (code, title, path, icon, menu_type, permission_code, sort_order, parent_id, description)
SELECT 'data_agent_assignments', '智能体归属', '/admin/employees/data/agent-assignments', 'Bot', 'ITEM',
       'employee:archive:development:view', 60, g.id, '跨员工智能体归属批管'
FROM sys_menu g WHERE g.code = 'group_archive_data_development'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE code = 'data_agent_assignments');

-- 批管 import/export 权限归属到对应试点/代表菜单
UPDATE permission p
JOIN sys_menu m ON m.code = 'data_id_documents' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.code IN ('employee:archive:personal:import', 'employee:archive:personal:export');

UPDATE permission p
JOIN sys_menu m ON m.code = 'data_cost_centers' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.code IN ('employee:archive:work:import', 'employee:archive:work:export');

UPDATE permission p
JOIN sys_menu m ON m.code = 'data_attendance_cards' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.code IN ('employee:archive:service:import', 'employee:archive:service:export');

UPDATE permission p
JOIN sys_menu m ON m.code = 'data_educations' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.code IN ('employee:archive:background:import', 'employee:archive:background:export');

UPDATE permission p
JOIN sys_menu m ON m.code = 'data_training_records' AND m.status = 'ACTIVE'
SET p.menu_id = m.id
WHERE p.code IN ('employee:archive:development:import', 'employee:archive:development:export');
