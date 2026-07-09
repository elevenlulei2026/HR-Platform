-- Slice 7.3：银行卡信息字典（账户类型、银行、支行、币种）+ bank_id/branch_id 改为字典编码存储

ALTER TABLE employee_bank_account
  MODIFY COLUMN bank_id VARCHAR(64) NULL COMMENT '银行字典编码',
  MODIFY COLUMN branch_id VARCHAR(64) NULL COMMENT '支行字典编码',
  ADD COLUMN primary_employee_id BIGINT
    GENERATED ALWAYS AS (CASE WHEN is_primary = 1 THEN employee_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uk_eba_primary_employee (primary_employee_id);

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'BANK_ACCOUNT_TYPE', '账户类型', '员工档案-银行卡：账户类型', 'ACTIVE', 70
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'BANK_ACCOUNT_TYPE');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ACCOUNT_TYPE', 'SALARY', '薪资帐户', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ACCOUNT_TYPE' AND value = 'SALARY');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ACCOUNT_TYPE', 'OTHER', '其他', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ACCOUNT_TYPE' AND value = 'OTHER');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'BANK_ID', '银行ID', '员工档案-银行卡：开户银行', 'ACTIVE', 71
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'BANK_ID');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'ICBC', '中国工商银行', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'ICBC');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'ABC', '中国农业银行', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'ABC');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'BOC', '中国银行', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'BOC');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'CCB', '中国建设银行', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'CCB');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'COMM', '交通银行', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'COMM');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'CMB', '招商银行', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'CMB');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'CITIC', '中信银行', 'ACTIVE', 70
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'CITIC');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'CMBC', '中国民生银行', 'ACTIVE', 80
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'CMBC');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'PSBC', '中国邮政储蓄银行', 'ACTIVE', 90
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'PSBC');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BANK_ID', 'CIB', '兴业银行', 'ACTIVE', 100
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BANK_ID' AND value = 'CIB');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'BRANCH_ID', '支行ID', '员工档案-银行卡：开户支行', 'ACTIVE', 72
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'BRANCH_ID');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BRANCH_ID', 'ICBC_HQ', '工商银行总行营业部', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BRANCH_ID' AND value = 'ICBC_HQ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BRANCH_ID', 'ICBC_BJ', '工商银行北京分行', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BRANCH_ID' AND value = 'ICBC_BJ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BRANCH_ID', 'ICBC_SH', '工商银行上海分行', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BRANCH_ID' AND value = 'ICBC_SH');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BRANCH_ID', 'CCB_BJ', '建设银行北京分行', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BRANCH_ID' AND value = 'CCB_BJ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BRANCH_ID', 'CCB_SH', '建设银行上海分行', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BRANCH_ID' AND value = 'CCB_SH');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BRANCH_ID', 'CMB_SZ', '招商银行深圳分行', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BRANCH_ID' AND value = 'CMB_SZ');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'BRANCH_ID', 'ABC_GZ', '农业银行广州分行', 'ACTIVE', 70
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'BRANCH_ID' AND value = 'ABC_GZ');

INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'CURRENCY', '币种', '员工档案-银行卡：币种', 'ACTIVE', 73
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'CURRENCY');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CURRENCY', 'CNY', '人民币', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'CURRENCY' AND value = 'CNY');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CURRENCY', 'USD', '美元', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'CURRENCY' AND value = 'USD');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CURRENCY', 'HKD', '港币', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'CURRENCY' AND value = 'HKD');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CURRENCY', 'EUR', '欧元', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'CURRENCY' AND value = 'EUR');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CURRENCY', 'GBP', '英镑', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'CURRENCY' AND value = 'GBP');
INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'CURRENCY', 'JPY', '日元', 'ACTIVE', 60
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'CURRENCY' AND value = 'JPY');
