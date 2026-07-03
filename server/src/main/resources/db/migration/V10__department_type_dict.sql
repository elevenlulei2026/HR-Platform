-- 字典：部门类型

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'DEPARTMENT_TYPE', '部门类型', '组织部门职能/业务类型分类', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'DEPARTMENT_TYPE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '10', '全球商务事业部', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '10');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '11', '集团', 'ACTIVE', 11
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '11');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '12', '总办', 'ACTIVE', 12
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '12');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '13', '产品', 'ACTIVE', 13
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '13');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '14', '品牌', 'ACTIVE', 14
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '14');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '15', '投资', 'ACTIVE', 15
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '15');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '16', '运营管理', 'ACTIVE', 16
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '16');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '17', '人力资源', 'ACTIVE', 17
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '17');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '18', '行政', 'ACTIVE', 18
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '18');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '19', '信息技术', 'ACTIVE', 19
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '19');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '20', '瑞科', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '20');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '21', '财务管理', 'ACTIVE', 21
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '21');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '22', '工厂', 'ACTIVE', 22
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '22');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '23', '工程技术', 'ACTIVE', 23
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '23');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '24', '采购', 'ACTIVE', 24
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '24');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '25', '品质', 'ACTIVE', 25
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '25');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '26', '制造', 'ACTIVE', 26
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '26');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '27', '供应链管理', 'ACTIVE', 27
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '27');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '28', 'Ecovacs商务事业部', 'ACTIVE', 28
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '28');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '29', '大中华区业务总部', 'ACTIVE', 29
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '29');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '30', '研发体系', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '30');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '31', '海外业务总部', 'ACTIVE', 31
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '31');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '32', '全球客户体验部', 'ACTIVE', 32
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '32');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '33', '全球DTC官方商城', 'ACTIVE', 33
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '33');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '34', 'Yeedi品牌事业部', 'ACTIVE', 34
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '34');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '35', '商用商务事业部', 'ACTIVE', 35
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '35');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '36', '研发', 'ACTIVE', 36
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '36');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '40', '工厂运营体系（苏州）', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '40');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEPARTMENT_TYPE', '50', '运营管理体系', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEPARTMENT_TYPE' AND value = '50');
