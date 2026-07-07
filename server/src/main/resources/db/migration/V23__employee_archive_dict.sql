-- Slice 7.1：证件信息字典种子（国家/地区、证件类型）

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'COUNTRY_REGION', '国家/地区', '证件国家或地区', 'ACTIVE', 22
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'COUNTRY_REGION');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'COUNTRY_REGION', 'CHINA', '中国', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'COUNTRY_REGION' AND value = 'CHINA');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'COUNTRY_REGION', 'HONG_KONG', '中国香港', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'COUNTRY_REGION' AND value = 'HONG_KONG');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'COUNTRY_REGION', 'MACAO', '中国澳门', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'COUNTRY_REGION' AND value = 'MACAO');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'COUNTRY_REGION', 'TAIWAN', '中国台湾', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'COUNTRY_REGION' AND value = 'TAIWAN');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'COUNTRY_REGION', 'OTHER', '其他', 'ACTIVE', 99
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'COUNTRY_REGION' AND value = 'OTHER');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'ID_TYPE', '证件类型', '员工证件类型', 'ACTIVE', 23
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'ID_TYPE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ID_TYPE', 'ID_CARD', '居民身份证', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ID_TYPE' AND value = 'ID_CARD');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ID_TYPE', 'PASSPORT', '护照', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ID_TYPE' AND value = 'PASSPORT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ID_TYPE', 'HK_MACAO_PERMIT', '港澳居民来往内地通行证', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ID_TYPE' AND value = 'HK_MACAO_PERMIT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ID_TYPE', 'TAIWAN_PERMIT', '台湾居民来往大陆通行证', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ID_TYPE' AND value = 'TAIWAN_PERMIT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ID_TYPE', 'OTHER', '其他', 'ACTIVE', 99
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ID_TYPE' AND value = 'OTHER');
