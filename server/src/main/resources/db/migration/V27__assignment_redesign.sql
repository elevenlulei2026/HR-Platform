-- Slice 7.2：任职记录重设计（对齐 docs/员工档案字段要求.md §2.1）

-- =========================================================
-- 1) employee_assignment 新列
-- =========================================================
ALTER TABLE employee_assignment ADD COLUMN hire_date DATE NULL COMMENT '入职日期';
ALTER TABLE employee_assignment ADD COLUMN is_rehire TINYINT(1) NULL COMMENT '是否重新雇佣';
ALTER TABLE employee_assignment ADD COLUMN movement_type VARCHAR(8) NULL COMMENT '职务异动操作码';
ALTER TABLE employee_assignment ADD COLUMN reason_code VARCHAR(8) NULL COMMENT '操作原因码';
ALTER TABLE employee_assignment ADD COLUMN reason_sub_code VARCHAR(8) NULL COMMENT '原因子项码';
ALTER TABLE employee_assignment ADD COLUMN employee_group_code VARCHAR(16) NULL COMMENT '员工组编码';
ALTER TABLE employee_assignment ADD COLUMN employee_subgroup_code VARCHAR(16) NULL COMMENT '员工子组编码';
ALTER TABLE employee_assignment ADD COLUMN legal_entity_code VARCHAR(32) NULL COMMENT '法人实体(字典 LEGAL_COMPANY)';
ALTER TABLE employee_assignment ADD COLUMN payroll_company_code VARCHAR(32) NULL COMMENT '发薪公司(字典 PAYROLL_COMPANY)';
ALTER TABLE employee_assignment ADD COLUMN cost_legal_entity_code VARCHAR(32) NULL COMMENT '成本归属法人(字典 LEGAL_COMPANY)';
ALTER TABLE employee_assignment ADD COLUMN position_start_date DATE NULL COMMENT '该岗位开始日期(冗余)';
ALTER TABLE employee_assignment ADD COLUMN true_resignation_reason_hrbp VARCHAR(512) NULL COMMENT '真实离职原因(HRBP)';
ALTER TABLE employee_assignment ADD COLUMN true_resignation_reason_sub_hrbp VARCHAR(256) NULL COMMENT '真实离职原因子类(HRBP)';
ALTER TABLE employee_assignment ADD COLUMN handover_employee_id BIGINT NULL COMMENT '交接人';
ALTER TABLE employee_assignment ADD COLUMN resignation_destination VARCHAR(256) NULL COMMENT '离职去向';
ALTER TABLE employee_assignment ADD COLUMN non_compete_company_suggest TINYINT(1) NULL COMMENT '是否启动竞业限制-公司建议';
ALTER TABLE employee_assignment ADD COLUMN non_compete_with_pay TINYINT(1) NULL COMMENT '是否给薪(竞业)';
ALTER TABLE employee_assignment ADD COLUMN assignment_indicator VARCHAR(16) NULL COMMENT '职务指示 PRIMARY/SECONDARY';

ALTER TABLE employee_assignment ADD KEY idx_ea_handover_employee_id (handover_employee_id);
ALTER TABLE employee_assignment ADD KEY idx_ea_employee_group_code (employee_group_code);

-- 回填职务指示
UPDATE employee_assignment
SET assignment_indicator = CASE WHEN is_primary = 1 THEN 'PRIMARY' ELSE 'SECONDARY' END
WHERE assignment_indicator IS NULL;

-- =========================================================
-- 2) 任职相关字典
-- =========================================================
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'SUPPLIER', '供应商', '任职雇工信息-供应商', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'SUPPLIER');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'SUPPLIER', 'SELF', '自有员工', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'SUPPLIER' AND value = 'SELF');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'SUPPLIER', 'OUTSOURCE', '外包供应商', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'SUPPLIER' AND value = 'OUTSOURCE');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'PROBATION_PERIOD', '试用期期限', '任职雇工信息-试用期期限', 'ACTIVE', 51
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'PROBATION_PERIOD');

INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'PROBATION_PERIOD', '1M', '1个月', 'ACTIVE', 10, JSON_OBJECT('months', 1)
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROBATION_PERIOD' AND value = '1M');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'PROBATION_PERIOD', '2M', '2个月', 'ACTIVE', 20, JSON_OBJECT('months', 2)
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROBATION_PERIOD' AND value = '2M');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'PROBATION_PERIOD', '3M', '3个月', 'ACTIVE', 30, JSON_OBJECT('months', 3)
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROBATION_PERIOD' AND value = '3M');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'PROBATION_PERIOD', '4M', '4个月', 'ACTIVE', 40, JSON_OBJECT('months', 4)
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROBATION_PERIOD' AND value = '4M');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'PROBATION_PERIOD', '5M', '5个月', 'ACTIVE', 50, JSON_OBJECT('months', 5)
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROBATION_PERIOD' AND value = '5M');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'PROBATION_PERIOD', '6M', '6个月', 'ACTIVE', 60, JSON_OBJECT('months', 6)
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PROBATION_PERIOD' AND value = '6M');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'CONTRACT_LOCATION', '合同地点', '任职岗位信息-合同地点', 'ACTIVE', 52
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'CONTRACT_LOCATION');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CONTRACT_LOCATION', 'HQ', '总部', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'CONTRACT_LOCATION' AND value = 'HQ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CONTRACT_LOCATION', 'BRANCH', '分公司', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'CONTRACT_LOCATION' AND value = 'BRANCH');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'WORK_LOCATION', '工作地点', '任职岗位信息-工作地点', 'ACTIVE', 53
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'WORK_LOCATION');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'WORK_LOCATION', 'SH', '上海', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'WORK_LOCATION' AND value = 'SH');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'WORK_LOCATION', 'SZ', '深圳', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'WORK_LOCATION' AND value = 'SZ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'WORK_LOCATION', 'CD', '成都', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'WORK_LOCATION' AND value = 'CD');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'WORK_LOCATION', 'BJ', '北京', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'WORK_LOCATION' AND value = 'BJ');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'APPROVAL_AUTHORITY', '审批权限', '任职岗位信息-审批权限', 'ACTIVE', 54
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'APPROVAL_AUTHORITY');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'APPROVAL_AUTHORITY', 'L1', '一级审批', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'APPROVAL_AUTHORITY' AND value = 'L1');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'APPROVAL_AUTHORITY', 'L2', '二级审批', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'APPROVAL_AUTHORITY' AND value = 'L2');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'APPROVAL_AUTHORITY', 'L3', '三级审批', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'APPROVAL_AUTHORITY' AND value = 'L3');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'JOB_GRADE', '岗位职级', '任职岗位信息-职级', 'ACTIVE', 55
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'JOB_GRADE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'JOB_GRADE', 'P1', 'P1', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'JOB_GRADE' AND value = 'P1');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'JOB_GRADE', 'P2', 'P2', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'JOB_GRADE' AND value = 'P2');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'JOB_GRADE', 'P3', 'P3', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'JOB_GRADE' AND value = 'P3');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'JOB_GRADE', 'M1', 'M1', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'JOB_GRADE' AND value = 'M1');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'JOB_GRADE', 'M2', 'M2', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'JOB_GRADE' AND value = 'M2');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'EMPLOYEE_NATURE', '员工性质', '任职岗位信息-员工性质', 'ACTIVE', 56
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'EMPLOYEE_NATURE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_NATURE', 'PRODUCTION', '生产类', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_NATURE' AND value = 'PRODUCTION');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_NATURE', 'RND', '科研类', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_NATURE' AND value = 'RND');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_NATURE', 'MANAGEMENT', '管理类', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_NATURE' AND value = 'MANAGEMENT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_NATURE', 'SALES', '营销类', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_NATURE' AND value = 'SALES');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_NATURE', 'FINANCE', '财务类', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_NATURE' AND value = 'FINANCE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_NATURE', 'PROCUREMENT', '采购类', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_NATURE' AND value = 'PROCUREMENT');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'GROUP_ATTR_LEVEL', '集团属性分级', '任职岗位信息-集团属性分级', 'ACTIVE', 57
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'GROUP_ATTR_LEVEL');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'GROUP_ATTR_LEVEL', 'FRONTLINE', '一线操作人员', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'GROUP_ATTR_LEVEL' AND value = 'FRONTLINE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'GROUP_ATTR_LEVEL', 'PROFESSIONAL', '专业技术人员', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'GROUP_ATTR_LEVEL' AND value = 'PROFESSIONAL');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'GROUP_ATTR_LEVEL', 'MIDDLE_MGR', '中层管理者', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'GROUP_ATTR_LEVEL' AND value = 'MIDDLE_MGR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'GROUP_ATTR_LEVEL', 'UPPER_MIDDLE_MGR', '中高层管理者', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'GROUP_ATTR_LEVEL' AND value = 'UPPER_MIDDLE_MGR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'GROUP_ATTR_LEVEL', 'BASE_MGR', '基层管理者', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'GROUP_ATTR_LEVEL' AND value = 'BASE_MGR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'GROUP_ATTR_LEVEL', 'SENIOR_MGR', '高层管理者', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'GROUP_ATTR_LEVEL' AND value = 'SENIOR_MGR');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'SALARY_GROUP', '薪资组', '任职薪酬信息-薪资组', 'ACTIVE', 58
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'SALARY_GROUP');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'SALARY_GROUP', 'SG_MONTHLY', '月薪组', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'SALARY_GROUP' AND value = 'SG_MONTHLY');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'SALARY_GROUP', 'SG_HOURLY', '时薪组', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'SALARY_GROUP' AND value = 'SG_HOURLY');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'PAYROLL_COMPANY', '发薪公司', '任职薪酬信息-发薪公司', 'ACTIVE', 59
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'PAYROLL_COMPANY');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PAYROLL_COMPANY', 'LE-DEFAULT', '星河数字科技有限公司', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PAYROLL_COMPANY' AND value = 'LE-DEFAULT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PAYROLL_COMPANY', 'LE-STAR-SZ', '星河软件（深圳）有限公司', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PAYROLL_COMPANY' AND value = 'LE-STAR-SZ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PAYROLL_COMPANY', 'LE-STAR-CD', '星河科技（成都）有限公司', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PAYROLL_COMPANY' AND value = 'LE-STAR-CD');
