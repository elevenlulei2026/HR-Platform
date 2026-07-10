-- 奖励记录：奖励类型/级别父子值 + 发放方式字典

-- 父子值：奖励类型（一级）→ 级别（二级；一般奖励无子项）
INSERT INTO parent_child_type (code, name, description, status, sort)
SELECT 'REWARD_TYPE', '奖励类型', '员工档案-奖励记录：奖励类型与级别父子联动', 'ACTIVE', 40
WHERE NOT EXISTS (SELECT 1 FROM parent_child_type WHERE code = 'REWARD_TYPE');

-- 一级：一般奖励（无子项，级别不显示）
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'REWARD_TYPE', '', '10', '一般奖励', 'ACTIVE', 10, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'REWARD_TYPE' AND pci.parent_code = '' AND pci.code = '10'
);

-- 一级：特殊嘉奖
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'REWARD_TYPE', '', '20', '特殊嘉奖', 'ACTIVE', 20, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'REWARD_TYPE' AND pci.parent_code = '' AND pci.code = '20'
);

-- 二级：特殊嘉奖 → 一等 / 二等 / 三等 / 特等
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'REWARD_TYPE', '20', '21', '一等', 'ACTIVE', 21, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'REWARD_TYPE' AND pci.parent_code = '20' AND pci.code = '21'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'REWARD_TYPE', '20', '22', '二等', 'ACTIVE', 22, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'REWARD_TYPE' AND pci.parent_code = '20' AND pci.code = '22'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'REWARD_TYPE', '20', '23', '三等', 'ACTIVE', 23, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'REWARD_TYPE' AND pci.parent_code = '20' AND pci.code = '23'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'REWARD_TYPE', '20', '24', '特等', 'ACTIVE', 24, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'REWARD_TYPE' AND pci.parent_code = '20' AND pci.code = '24'
);

-- 数据字典：发放方式
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'REWARD_PAYMENT_METHOD', '奖励发放方式', '员工档案-奖励记录：发放方式', 'ACTIVE', 70
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'REWARD_PAYMENT_METHOD');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'REWARD_PAYMENT_METHOD', '10', '工资发放', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'REWARD_PAYMENT_METHOD' AND value = '10');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'REWARD_PAYMENT_METHOD', '20', '现金发放', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'REWARD_PAYMENT_METHOD' AND value = '20');
