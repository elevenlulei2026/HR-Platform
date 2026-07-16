-- 批量回填已上线菜单说明（与 client/src/config/admin-nav.ts Mega 文案对齐）

-- ========== 组织与员工 ==========
UPDATE sys_menu SET description = '维护组织层级、关键属性与历史快照' WHERE code = 'org_structure';
UPDATE sys_menu SET description = '图形化浏览组织树，下钻查看岗位与人员' WHERE code = 'org_chart';
UPDATE sys_menu SET description = '统一维护岗位信息、分类与任职要求' WHERE code = 'org_positions';
UPDATE sys_menu SET description = '规划部门编制并跟踪占用与使用率' WHERE code = 'org_headcount';

UPDATE sys_menu SET description = '集中查询员工信息并快速查看完整档案' WHERE code = 'employee_roster';
UPDATE sys_menu SET description = '维护员工汇报关系并按日期查看历史' WHERE code = 'reporting_lines';
UPDATE sys_menu SET description = '跨员工批量维护证件、合同、协议等档案' WHERE code = 'archive_data';

UPDATE sys_menu SET description = '管理入职资料、流程与办理进度' WHERE code = 'onboarding';
UPDATE sys_menu SET description = '办理转岗、调动等员工任职变更' WHERE code = 'movements';
UPDATE sys_menu SET description = '管理离职流程、交接与状态变更' WHERE code = 'offboarding';
UPDATE sys_menu SET description = '维护劳动合同信息与到期续签' WHERE code = 'contracts';

-- ========== 平台 ==========
UPDATE sys_menu SET description = '配置审批流程定义与节点规则' WHERE code = 'workflow';
UPDATE sys_menu SET description = '处理待办任务并跟踪审批进度' WHERE code = 'tasks';
UPDATE sys_menu SET description = '管理角色、菜单与功能权限' WHERE code = 'permissions';
UPDATE sys_menu SET description = '查询系统关键操作与安全审计记录' WHERE code = 'audit';
UPDATE sys_menu SET description = '查看服务健康状态与接口联通情况' WHERE code = 'dev_health';

-- ========== 顶栏直达 ==========
UPDATE sys_menu SET description = '人力指标总览与待办摘要' WHERE code = 'dashboard';
UPDATE sys_menu SET description = '查看经营看板与人力分析报表' WHERE code = 'reports';
UPDATE sys_menu SET description = '维护字典、编码规则与系统参数' WHERE code = 'settings';
