-- 教育经历字段优化：学历/学位字典、多附件

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'EDUCATION', '学历', '教育经历学历层次', 'ACTIVE', 24
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'EDUCATION');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EDUCATION', 'PHD', '博士研究生', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EDUCATION' AND value = 'PHD');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EDUCATION', 'MASTER', '硕士研究生', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EDUCATION' AND value = 'MASTER');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EDUCATION', 'BACHELOR', '本科', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EDUCATION' AND value = 'BACHELOR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EDUCATION', 'COLLEGE', '大专', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EDUCATION' AND value = 'COLLEGE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EDUCATION', 'HIGH_SCHOOL', '高中及以下', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EDUCATION' AND value = 'HIGH_SCHOOL');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EDUCATION', 'OTHER', '其他', 'ACTIVE', 99
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EDUCATION' AND value = 'OTHER');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'DEGREE', '学位', '教育经历学位', 'ACTIVE', 25
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'DEGREE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEGREE', 'DOCTOR', '博士', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEGREE' AND value = 'DOCTOR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEGREE', 'MASTER', '硕士', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEGREE' AND value = 'MASTER');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEGREE', 'BACHELOR', '学士', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEGREE' AND value = 'BACHELOR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEGREE', 'NONE', '无学位', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEGREE' AND value = 'NONE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'DEGREE', 'OTHER', '其他', 'ACTIVE', 99
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'DEGREE' AND value = 'OTHER');

ALTER TABLE employee_education
  ADD COLUMN attachment_ids VARCHAR(512) NULL AFTER degree_no;

UPDATE employee_education
SET attachment_ids = CAST(attachment_id AS CHAR)
WHERE attachment_id IS NOT NULL AND (attachment_ids IS NULL OR attachment_ids = '');

ALTER TABLE employee_education DROP COLUMN attachment_id;
