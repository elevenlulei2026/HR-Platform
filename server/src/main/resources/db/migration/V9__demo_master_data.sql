-- Slice 5 & 6 演示样例：星河数字科技集团（完整主数据）

-- 1) 更新既有种子为集团叙事
UPDATE legal_entity
SET name = '星河数字科技有限公司',
    credit_code = '91310000MA1K8X7Y2Q',
    region = '上海市浦东新区'
WHERE code = 'LE-DEFAULT';

UPDATE cost_center
SET name = '集团共享成本中心'
WHERE code = 'CC-DEFAULT';

UPDATE organization
SET name = '星河数字科技集团'
WHERE code = 'ORG-ROOT' AND effective_end_date IS NULL;

-- 2) 法人实体
INSERT INTO legal_entity (code, name, credit_code, region, status)
SELECT 'LE-STAR-HOLDING', '星河控股集团有限公司', '91310000MA1HOLDING', '上海市黄浦区', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM legal_entity WHERE code = 'LE-STAR-HOLDING');

INSERT INTO legal_entity (code, name, credit_code, region, status)
SELECT 'LE-STAR-SZ', '星河软件（深圳）有限公司', '91440300MA5SZTECH', '广东省深圳市南山区', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM legal_entity WHERE code = 'LE-STAR-SZ');

INSERT INTO legal_entity (code, name, credit_code, region, status)
SELECT 'LE-STAR-CD', '星河科技（成都）有限公司', '91510100MA6CDTECH', '四川省成都市高新区', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM legal_entity WHERE code = 'LE-STAR-CD');

-- 3) 成本中心
INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-HR', '人力资源成本中心', le.id, 'ACTIVE'
FROM legal_entity le WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-HR');

INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-FIN', '财务行政成本中心', le.id, 'ACTIVE'
FROM legal_entity le WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-FIN');

INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-RD', '研发成本中心', le.id, 'ACTIVE'
FROM legal_entity le WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-RD');

INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-PD', '产品成本中心', le.id, 'ACTIVE'
FROM legal_entity le WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-PD');

INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-SM', '销售市场成本中心', le.id, 'ACTIVE'
FROM legal_entity le WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-SM');

INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-CS', '客户成功成本中心', le.id, 'ACTIVE'
FROM legal_entity le WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-CS');

INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-SZ-RD', '深圳研发成本中心', le.id, 'ACTIVE'
FROM legal_entity le WHERE le.code = 'LE-STAR-SZ'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-SZ-RD');

INSERT INTO cost_center (code, name, legal_entity_id, status)
SELECT 'CC-CD-RD', '成都研发成本中心', le.id, 'ACTIVE'
FROM legal_entity le WHERE le.code = 'LE-STAR-CD'
  AND NOT EXISTS (SELECT 1 FROM cost_center WHERE code = 'CC-CD-RD');

-- 4) 组织树（一级中心 / 二级部门 / 三级团队）
INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-HR', '人力资源中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-HR'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-HR' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-FIN', '财务与行政中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-FIN'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-FIN' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD', '技术研发中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-RD'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-PD', '产品中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-PD'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-PD' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-SM', '销售中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2020-01-01', '2024-12-31', 'INACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-SM'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (
    SELECT 1 FROM organization
    WHERE code = 'ORG-SM' AND effective_start_date = '2020-01-01' AND effective_end_date = '2024-12-31'
  );

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-SM', '销售与市场中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2025-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-SM'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-SM' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-CS', '客户成功中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-CS'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-CS' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-SZ', '深圳研发中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2021-06-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-SZ-RD'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-STAR-SZ'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-SZ' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-CD', '成都研发中心', 'ORG-ROOT', p.id, 'DIVISION', le.id, cc.id, '2022-03-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-CD-RD'
JOIN organization p ON p.code = 'ORG-ROOT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-STAR-CD'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-CD' AND effective_end_date IS NULL);

-- 研发二级部门
INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-PLAT', '平台研发部', 'ORG-RD', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-RD'
JOIN organization p ON p.code = 'ORG-RD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-PLAT' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-BIZ', '业务研发部', 'ORG-RD', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-RD'
JOIN organization p ON p.code = 'ORG-RD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-BIZ' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-QA', '质量保障部', 'ORG-RD', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-RD'
JOIN organization p ON p.code = 'ORG-RD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-QA' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-DATA', '数据智能部', 'ORG-RD', p.id, 'DEPARTMENT', le.id, cc.id, '2021-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-RD'
JOIN organization p ON p.code = 'ORG-RD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-DATA' AND effective_end_date IS NULL);

-- 产品二级部门
INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-PD-ENT', '企业产品部', 'ORG-PD', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-PD'
JOIN organization p ON p.code = 'ORG-PD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-PD-ENT' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-PD-CON', '消费产品部', 'ORG-PD', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-PD'
JOIN organization p ON p.code = 'ORG-PD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-PD-CON' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-PD-UX', '体验设计部', 'ORG-PD', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-PD'
JOIN organization p ON p.code = 'ORG-PD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-PD-UX' AND effective_end_date IS NULL);

-- 销售二级部门
INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-SM-EAST', '华东销售部', 'ORG-SM', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-SM'
JOIN organization p ON p.code = 'ORG-SM' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-SM-EAST' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-SM-NORTH', '华北销售部', 'ORG-SM', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-SM'
JOIN organization p ON p.code = 'ORG-SM' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-SM-NORTH' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-SM-SOUTH', '华南销售部', 'ORG-SM', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-SM'
JOIN organization p ON p.code = 'ORG-SM' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-SM-SOUTH' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-SM-MKT', '市场营销部', 'ORG-SM', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-SM'
JOIN organization p ON p.code = 'ORG-SM' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-SM-MKT' AND effective_end_date IS NULL);

-- HR / 财务二级部门
INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-HR-COE', 'HR COE 组', 'ORG-HR', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-HR'
JOIN organization p ON p.code = 'ORG-HR' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-HR-COE' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-HR-BP', 'HRBP 组', 'ORG-HR', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-HR'
JOIN organization p ON p.code = 'ORG-HR' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-HR-BP' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-FIN-ACC', '财务会计部', 'ORG-FIN', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-FIN'
JOIN organization p ON p.code = 'ORG-FIN' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-FIN-ACC' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-FIN-ADM', '行政办公部', 'ORG-FIN', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-FIN'
JOIN organization p ON p.code = 'ORG-FIN' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-FIN-ADM' AND effective_end_date IS NULL);

-- 客户成功二级
INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-CS-ONB', '实施交付部', 'ORG-CS', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-CS'
JOIN organization p ON p.code = 'ORG-CS' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-CS-ONB' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-CS-SUP', '客户支持部', 'ORG-CS', p.id, 'DEPARTMENT', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-CS'
JOIN organization p ON p.code = 'ORG-CS' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-CS-SUP' AND effective_end_date IS NULL);

-- 三级团队（研发）
INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-PLAT-BE', '平台后端组', 'ORG-RD-PLAT', p.id, 'TEAM', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-RD'
JOIN organization p ON p.code = 'ORG-RD-PLAT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-PLAT-BE' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-PLAT-FE', '平台前端组', 'ORG-RD-PLAT', p.id, 'TEAM', le.id, cc.id, '2020-01-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-RD'
JOIN organization p ON p.code = 'ORG-RD-PLAT' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-PLAT-FE' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-CD-BE', '成都后端组', 'ORG-RD-CD', p.id, 'TEAM', le.id, cc.id, '2022-03-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-CD-RD'
JOIN organization p ON p.code = 'ORG-RD-CD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-STAR-CD'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-CD-BE' AND effective_end_date IS NULL);

INSERT INTO organization (code, name, parent_code, parent_id, org_type, legal_entity_id, cost_center_id, effective_start_date, effective_end_date, status)
SELECT 'ORG-RD-CD-FE', '成都前端组', 'ORG-RD-CD', p.id, 'TEAM', le.id, cc.id, '2022-03-01', NULL, 'ACTIVE'
FROM legal_entity le
JOIN cost_center cc ON cc.code = 'CC-CD-RD'
JOIN organization p ON p.code = 'ORG-RD-CD' AND p.effective_end_date IS NULL
WHERE le.code = 'LE-STAR-CD'
  AND NOT EXISTS (SELECT 1 FROM organization WHERE code = 'ORG-RD-CD-FE' AND effective_end_date IS NULL);

-- 5) 职务体系
INSERT INTO job (code, name, description, status) SELECT 'JOB-CEO', '首席执行官', '公司最高管理者', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-CEO');
INSERT INTO job (code, name, description, status) SELECT 'JOB-CTO', '首席技术官', '技术战略与研发负责人', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-CTO');
INSERT INTO job (code, name, description, status) SELECT 'JOB-CFO', '首席财务官', '财务与资本运作负责人', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-CFO');
INSERT INTO job (code, name, description, status) SELECT 'JOB-CHRO', '首席人力官', '人力资源战略负责人', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-CHRO');
INSERT INTO job (code, name, description, status) SELECT 'JOB-VP', '副总裁', '业务线或职能副总裁', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-VP');
INSERT INTO job (code, name, description, status) SELECT 'JOB-DIR', '总监', '部门/中心负责人', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-DIR');
INSERT INTO job (code, name, description, status) SELECT 'JOB-TL', '团队负责人', '小组或团队 Leader', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-TL');
INSERT INTO job (code, name, description, status) SELECT 'JOB-SE', '软件工程师', '通用研发工程师', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-SE');
INSERT INTO job (code, name, description, status) SELECT 'JOB-FE', '前端工程师', 'Web/移动端前端开发', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-FE');
INSERT INTO job (code, name, description, status) SELECT 'JOB-BE', '后端工程师', '服务端与平台开发', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-BE');
INSERT INTO job (code, name, description, status) SELECT 'JOB-QA', '测试工程师', '质量保障与自动化测试', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-QA');
INSERT INTO job (code, name, description, status) SELECT 'JOB-PM', '产品经理', '产品规划与需求管理', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-PM');
INSERT INTO job (code, name, description, status) SELECT 'JOB-UX', '体验设计师', '交互与视觉设计', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-UX');
INSERT INTO job (code, name, description, status) SELECT 'JOB-DA', '数据分析师', '数据分析与 BI', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-DA');
INSERT INTO job (code, name, description, status) SELECT 'JOB-HRBP', 'HRBP', '业务伙伴型 HR', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-HRBP');
INSERT INTO job (code, name, description, status) SELECT 'JOB-HR-SPEC', 'HR 专员', '招聘/薪酬/员工关系', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-HR-SPEC');
INSERT INTO job (code, name, description, status) SELECT 'JOB-FIN-ACC', '财务会计', '核算与报表', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-FIN-ACC');
INSERT INTO job (code, name, description, status) SELECT 'JOB-ADM', '行政专员', '办公与后勤支持', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-ADM');
INSERT INTO job (code, name, description, status) SELECT 'JOB-SALES-MGR', '销售经理', '区域或行业销售管理', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-SALES-MGR');
INSERT INTO job (code, name, description, status) SELECT 'JOB-SALES', '销售代表', '客户开拓与签约', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-SALES');
INSERT INTO job (code, name, description, status) SELECT 'JOB-MKT', '市场专员', '品牌与市场活动', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-MKT');
INSERT INTO job (code, name, description, status) SELECT 'JOB-CSM', '客户成功经理', '续约与增购', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-CSM');
INSERT INTO job (code, name, description, status) SELECT 'JOB-IMPL', '实施顾问', '项目交付与上线', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-IMPL');
INSERT INTO job (code, name, description, status) SELECT 'JOB-SUP', '技术支持工程师', '售后技术支持', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-SUP');
INSERT INTO job (code, name, description, status) SELECT 'JOB-INTERN', '实习生', '在校实习岗位', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job WHERE code = 'JOB-INTERN');

-- 6) 职级体系（管理 M / 专业 P / 支撑 S）
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'M1', 'M1 初级经理', 110, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'M1');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'M2', 'M2 中级经理', 120, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'M2');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'M3', 'M3 高级经理', 130, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'M3');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'M4', 'M4 总监层', 140, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'M4');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'P1', 'P1 初级专业', 210, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'P1');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'P2', 'P2 中级专业', 220, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'P2');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'P3', 'P3 高级专业', 230, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'P3');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'P4', 'P4 资深专业', 240, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'P4');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'P5', 'P5 专家', 250, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'P5');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'P6', 'P6 资深专家', 260, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'P6');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'S1', 'S1 实习/初级', 310, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'S1');
INSERT INTO job_grade (code, name, sequence_order, status) SELECT 'S2', 'S2 中级支撑', 320, 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM job_grade WHERE code = 'S2');

UPDATE job_grade SET name = 'G1 入门职级', sequence_order = 10 WHERE code = 'G1';
UPDATE job_grade SET name = 'G2 标准职级', sequence_order = 20 WHERE code = 'G2';
UPDATE job_grade SET name = 'G3 骨干职级', sequence_order = 30 WHERE code = 'G3';

-- 7) 岗位（按组织挂载）
INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-ROOT-CEO', '集团总裁', o.id, j.id, 1, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-CEO'
WHERE o.code = 'ORG-ROOT' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-ROOT-CEO');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-HR-DIR', '人力资源总监', o.id, j.id, 1, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-DIR'
WHERE o.code = 'ORG-HR' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-HR-DIR');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-HR-BP-01', 'HRBP（企业业务）', o.id, j.id, 3, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-HRBP'
WHERE o.code = 'ORG-HR-BP' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-HR-BP-01');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-HR-SPEC-REC', '招聘专员', o.id, j.id, 4, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-HR-SPEC'
WHERE o.code = 'ORG-HR-COE' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-HR-SPEC-REC');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-CTO', '技术中心负责人', o.id, j.id, 1, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-CTO'
WHERE o.code = 'ORG-RD' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-CTO');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-PLAT-DIR', '平台研发总监', o.id, j.id, 1, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-DIR'
WHERE o.code = 'ORG-RD-PLAT' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-PLAT-DIR');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-PLAT-BE-TL', '平台后端负责人', o.id, j.id, 1, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-TL'
WHERE o.code = 'ORG-RD-PLAT-BE' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-PLAT-BE-TL');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-PLAT-BE-SE', '平台后端工程师', o.id, j.id, 8, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-BE'
WHERE o.code = 'ORG-RD-PLAT-BE' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-PLAT-BE-SE');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-PLAT-FE-SE', '平台前端工程师', o.id, j.id, 6, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-FE'
WHERE o.code = 'ORG-RD-PLAT-FE' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-PLAT-FE-SE');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-BIZ-SE', '业务研发工程师', o.id, j.id, 12, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-SE'
WHERE o.code = 'ORG-RD-BIZ' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-BIZ-SE');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-QA-SE', '测试工程师', o.id, j.id, 8, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-QA'
WHERE o.code = 'ORG-RD-QA' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-QA-SE');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-DATA-DA', '数据分析师', o.id, j.id, 5, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-DA'
WHERE o.code = 'ORG-RD-DATA' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-DATA-DA');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-PD-ENT-PM', '企业产品经理', o.id, j.id, 4, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-PM'
WHERE o.code = 'ORG-PD-ENT' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-PD-ENT-PM');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-PD-CON-PM', '消费产品经理', o.id, j.id, 3, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-PM'
WHERE o.code = 'ORG-PD-CON' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-PD-CON-PM');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-PD-UX-DES', 'UX 设计师', o.id, j.id, 6, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-UX'
WHERE o.code = 'ORG-PD-UX' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-PD-UX-DES');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-SM-EAST-MGR', '华东销售经理', o.id, j.id, 2, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-SALES-MGR'
WHERE o.code = 'ORG-SM-EAST' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-SM-EAST-MGR');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-SM-EAST-REP', '华东销售代表', o.id, j.id, 10, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-SALES'
WHERE o.code = 'ORG-SM-EAST' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-SM-EAST-REP');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-SM-NORTH-REP', '华北销售代表', o.id, j.id, 8, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-SALES'
WHERE o.code = 'ORG-SM-NORTH' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-SM-NORTH-REP');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-SM-MKT-SPEC', '市场专员', o.id, j.id, 5, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-MKT'
WHERE o.code = 'ORG-SM-MKT' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-SM-MKT-SPEC');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-FIN-CFO', '财务总监', o.id, j.id, 1, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-CFO'
WHERE o.code = 'ORG-FIN' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-FIN-CFO');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-FIN-ACC-SPEC', '会计', o.id, j.id, 4, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-FIN-ACC'
WHERE o.code = 'ORG-FIN-ACC' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-FIN-ACC-SPEC');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-FIN-ADM-SPEC', '行政专员', o.id, j.id, 3, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-ADM'
WHERE o.code = 'ORG-FIN-ADM' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-FIN-ADM-SPEC');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-CS-CSM', '客户成功经理', o.id, j.id, 6, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-CSM'
WHERE o.code = 'ORG-CS' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-CS-CSM');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-CS-IMPL', '实施顾问', o.id, j.id, 8, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-IMPL'
WHERE o.code = 'ORG-CS-ONB' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-CS-IMPL');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-CS-SUP-ENG', '技术支持工程师', o.id, j.id, 6, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-SUP'
WHERE o.code = 'ORG-CS-SUP' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-CS-SUP-ENG');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-CD-BE-SE', '成都后端工程师', o.id, j.id, 10, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-BE'
WHERE o.code = 'ORG-RD-CD-BE' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-CD-BE-SE');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-CD-FE-SE', '成都前端工程师', o.id, j.id, 8, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-FE'
WHERE o.code = 'ORG-RD-CD-FE' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-CD-FE-SE');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-RD-SZ-SE', '深圳研发工程师', o.id, j.id, 15, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-SE'
WHERE o.code = 'ORG-RD-SZ' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-RD-SZ-SE');

INSERT INTO position (code, name, organization_id, job_id, headcount, status)
SELECT 'POS-INTERN-RD', '研发实习生', o.id, j.id, 6, 'ACTIVE'
FROM organization o JOIN job j ON j.code = 'JOB-INTERN'
WHERE o.code = 'ORG-RD-BIZ' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM position WHERE code = 'POS-INTERN-RD');

-- 8) 编制计划（2025 / 2026，含已用与在途）
INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 28, 22, 2 FROM organization o WHERE o.code = 'ORG-HR' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 32, 24, 3 FROM organization o WHERE o.code = 'ORG-HR' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 18, 15, 1 FROM organization o WHERE o.code = 'ORG-FIN' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 20, 16, 2 FROM organization o WHERE o.code = 'ORG-FIN' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 180, 156, 8 FROM organization o WHERE o.code = 'ORG-RD' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 210, 168, 12 FROM organization o WHERE o.code = 'ORG-RD' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 52, 45, 3 FROM organization o WHERE o.code = 'ORG-RD-PLAT' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 60, 48, 4 FROM organization o WHERE o.code = 'ORG-RD-PLAT' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 48, 42, 2 FROM organization o WHERE o.code = 'ORG-RD-BIZ' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 55, 44, 3 FROM organization o WHERE o.code = 'ORG-RD-BIZ' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 22, 19, 1 FROM organization o WHERE o.code = 'ORG-RD-QA' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 26, 21, 2 FROM organization o WHERE o.code = 'ORG-RD-QA' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 35, 28, 2 FROM organization o WHERE o.code = 'ORG-PD' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 40, 30, 3 FROM organization o WHERE o.code = 'ORG-PD' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 65, 58, 4 FROM organization o WHERE o.code = 'ORG-SM' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 72, 60, 5 FROM organization o WHERE o.code = 'ORG-SM' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 22, 18, 2 FROM organization o WHERE o.code = 'ORG-SM-EAST' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 26, 20, 3 FROM organization o WHERE o.code = 'ORG-SM-EAST' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 30, 24, 2 FROM organization o WHERE o.code = 'ORG-CS' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 36, 28, 3 FROM organization o WHERE o.code = 'ORG-CS' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 38, 32, 2 FROM organization o WHERE o.code = 'ORG-RD-CD' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 45, 36, 4 FROM organization o WHERE o.code = 'ORG-RD-CD' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 42, 35, 3 FROM organization o WHERE o.code = 'ORG-RD-SZ' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 50, 38, 4 FROM organization o WHERE o.code = 'ORG-RD-SZ' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);

-- 集团总编制（根节点汇总视角）
INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2025, 420, 365, 18 FROM organization o WHERE o.code = 'ORG-ROOT' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2025);

INSERT INTO headcount_plan (organization_id, fiscal_year, planned_count, occupied_count, reserved_count)
SELECT o.id, 2026, 480, 390, 24 FROM organization o WHERE o.code = 'ORG-ROOT' AND o.effective_end_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM headcount_plan hp WHERE hp.organization_id = o.id AND hp.fiscal_year = 2026);
