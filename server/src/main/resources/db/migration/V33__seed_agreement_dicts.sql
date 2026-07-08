-- Slice 7：协议信息字典种子（操作类型 + 协议类别）

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'AGREEMENT_OPERATION_TYPE', '协议操作类型', '员工档案-协议信息：操作类型（新签/续签/变更/解除）', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'AGREEMENT_OPERATION_TYPE');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'AGREEMENT_CATEGORY', '协议类别', '员工档案-协议信息：协议类别', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'AGREEMENT_CATEGORY');

-- 操作类型
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_OPERATION_TYPE', '10', '新签', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_OPERATION_TYPE' AND value='10');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_OPERATION_TYPE', '20', '续签', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_OPERATION_TYPE' AND value='20');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_OPERATION_TYPE', '30', '变更', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_OPERATION_TYPE' AND value='30');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_OPERATION_TYPE', '40', '解除', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_OPERATION_TYPE' AND value='40');

-- 协议类别
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '10', '三方调动协议', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='10');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '20', '保密协议', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='20');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '30', '其他协议', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='30');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '40', '培训协议', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='40');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '50', '外派协议', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='50');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '60', '福利协议', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='60');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '70', '竞业协议', 'ACTIVE', 70
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='70');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '80', '竞业履行协议', 'ACTIVE', 80
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='80');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'AGREEMENT_CATEGORY', '90', '补充协议', 'ACTIVE', 90
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code='AGREEMENT_CATEGORY' AND value='90');

