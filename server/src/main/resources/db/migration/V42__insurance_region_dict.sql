-- Slice 7：员工档案-员工服务-社保公积金 字典（参保地区）+ 发薪公司兜底

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'INSURANCE_REGION', '参保地区', '员工档案-社保公积金：参保地区', 'ACTIVE', 74
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'INSURANCE_REGION');

-- 参保地区：预置少量常用项（可在字典管理中维护扩展）
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'INSURANCE_REGION', 'BJ', '北京', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'INSURANCE_REGION' AND value = 'BJ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'INSURANCE_REGION', 'SH', '上海', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'INSURANCE_REGION' AND value = 'SH');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'INSURANCE_REGION', 'GZ', '广州', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'INSURANCE_REGION' AND value = 'GZ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'INSURANCE_REGION', 'SZ', '深圳', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'INSURANCE_REGION' AND value = 'SZ');

-- 发薪公司（PAYROLL_COMPANY）通常已在任职字典中存在，这里只做类型兜底，避免社保公积金下拉无数据源
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'PAYROLL_COMPANY', '发薪公司', '员工任职/员工服务：发薪公司', 'ACTIVE', 75
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'PAYROLL_COMPANY');

