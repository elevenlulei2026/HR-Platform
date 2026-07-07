-- Slice 7.1：个人主档字典种子（婚姻/政治面貌/学历/生育/民族/国籍/户口/关系/招聘渠道）

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'MARITAL_STATUS', '婚育状况', '员工婚姻状况', 'ACTIVE', 13
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'MARITAL_STATUS');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'MARITAL_STATUS', 'SINGLE', '未婚', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MARITAL_STATUS' AND value = 'SINGLE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'MARITAL_STATUS', 'MARRIED', '已婚', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MARITAL_STATUS' AND value = 'MARRIED');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'MARITAL_STATUS', 'DIVORCED', '离异', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MARITAL_STATUS' AND value = 'DIVORCED');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'MARITAL_STATUS', 'WIDOWED', '丧偶', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MARITAL_STATUS' AND value = 'WIDOWED');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'POLITICAL_AFFILIATION', '政治面貌', '员工政治面貌', 'ACTIVE', 14
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'POLITICAL_AFFILIATION');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POLITICAL_AFFILIATION', 'PARTY', '中共党员', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POLITICAL_AFFILIATION' AND value = 'PARTY');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POLITICAL_AFFILIATION', 'LEAGUE', '共青团员', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POLITICAL_AFFILIATION' AND value = 'LEAGUE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'POLITICAL_AFFILIATION', 'MASSES', '群众', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'POLITICAL_AFFILIATION' AND value = 'MASSES');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'HIGHEST_EDUCATION', '最高学历', '员工最高学历', 'ACTIVE', 15
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'HIGHEST_EDUCATION');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'HIGHEST_EDUCATION', 'PHD', '博士研究生', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'HIGHEST_EDUCATION' AND value = 'PHD');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'HIGHEST_EDUCATION', 'MASTER', '硕士研究生', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'HIGHEST_EDUCATION' AND value = 'MASTER');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'HIGHEST_EDUCATION', 'BACHELOR', '本科', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'HIGHEST_EDUCATION' AND value = 'BACHELOR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'HIGHEST_EDUCATION', 'COLLEGE', '大专', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'HIGHEST_EDUCATION' AND value = 'COLLEGE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'HIGHEST_EDUCATION', 'HIGH_SCHOOL', '高中及以下', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'HIGHEST_EDUCATION' AND value = 'HIGH_SCHOOL');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'FERTILITY_STATUS', '生育状况', '员工生育状况', 'ACTIVE', 16
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'FERTILITY_STATUS');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'FERTILITY_STATUS', 'NONE', '未育', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'FERTILITY_STATUS' AND value = 'NONE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'FERTILITY_STATUS', 'ONE_CHILD', '一孩', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'FERTILITY_STATUS' AND value = 'ONE_CHILD');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'FERTILITY_STATUS', 'TWO_CHILDREN', '二孩', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'FERTILITY_STATUS' AND value = 'TWO_CHILDREN');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'FERTILITY_STATUS', 'THREE_PLUS', '三孩及以上', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'FERTILITY_STATUS' AND value = 'THREE_PLUS');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'ETHNICITY', '民族', '员工民族', 'ACTIVE', 17
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'ETHNICITY');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ETHNICITY', 'HAN', '汉族', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ETHNICITY' AND value = 'HAN');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ETHNICITY', 'HUI', '回族', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ETHNICITY' AND value = 'HUI');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ETHNICITY', 'MIAO', '苗族', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ETHNICITY' AND value = 'MIAO');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ETHNICITY', 'ZHUANG', '壮族', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ETHNICITY' AND value = 'ZHUANG');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ETHNICITY', 'UYGHUR', '维吾尔族', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ETHNICITY' AND value = 'UYGHUR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ETHNICITY', 'TIBETAN', '藏族', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ETHNICITY' AND value = 'TIBETAN');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'ETHNICITY', 'OTHER', '其他', 'ACTIVE', 99
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'ETHNICITY' AND value = 'OTHER');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'NATIONALITY', '国籍', '员工国籍', 'ACTIVE', 18
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'NATIONALITY');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'NATIONALITY', 'CHINA', '中国', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'NATIONALITY' AND value = 'CHINA');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'NATIONALITY', 'HONG_KONG', '中国香港', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'NATIONALITY' AND value = 'HONG_KONG');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'NATIONALITY', 'MACAO', '中国澳门', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'NATIONALITY' AND value = 'MACAO');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'NATIONALITY', 'TAIWAN', '中国台湾', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'NATIONALITY' AND value = 'TAIWAN');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'NATIONALITY', 'OTHER', '其他', 'ACTIVE', 99
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'NATIONALITY' AND value = 'OTHER');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'HOUSEHOLD_TYPE', '户口性质', '员工户口类别', 'ACTIVE', 19
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'HOUSEHOLD_TYPE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'HOUSEHOLD_TYPE', 'URBAN', '城镇户口', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'HOUSEHOLD_TYPE' AND value = 'URBAN');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'HOUSEHOLD_TYPE', 'RURAL', '农村户口', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'HOUSEHOLD_TYPE' AND value = 'RURAL');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'EMPLOYEE_RELATION', '与员工关系', '家属/紧急联系人与员工关系', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'EMPLOYEE_RELATION');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_RELATION', 'PARENT', '父母', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_RELATION' AND value = 'PARENT');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_RELATION', 'SPOUSE', '配偶', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_RELATION' AND value = 'SPOUSE');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_RELATION', 'CHILD', '子女', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_RELATION' AND value = 'CHILD');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_RELATION', 'SIBLING', '兄弟姐妹', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_RELATION' AND value = 'SIBLING');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_RELATION', 'FRIEND', '朋友', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_RELATION' AND value = 'FRIEND');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'EMPLOYEE_RELATION', 'OTHER', '其他', 'ACTIVE', 99
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'EMPLOYEE_RELATION' AND value = 'OTHER');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'RECRUITMENT_CHANNEL', '招聘渠道', '员工招聘来源渠道', 'ACTIVE', 21
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'RECRUITMENT_CHANNEL');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'RECRUITMENT_CHANNEL', 'INTERNAL', '内部推荐', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'RECRUITMENT_CHANNEL' AND value = 'INTERNAL');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'RECRUITMENT_CHANNEL', 'REFERRAL', '员工推荐', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'RECRUITMENT_CHANNEL' AND value = 'REFERRAL');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'RECRUITMENT_CHANNEL', 'HEADHUNTER', '猎头', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'RECRUITMENT_CHANNEL' AND value = 'HEADHUNTER');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'RECRUITMENT_CHANNEL', 'CAMPUS', '校园招聘', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'RECRUITMENT_CHANNEL' AND value = 'CAMPUS');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'RECRUITMENT_CHANNEL', 'SOCIAL', '社会招聘', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'RECRUITMENT_CHANNEL' AND value = 'SOCIAL');
