-- 惩处记录：惩处类型/类别父子值 + 扣款方式字典 + 涉及赔偿字段

ALTER TABLE employee_penalty
  ADD COLUMN involves_compensation TINYINT(1) NULL COMMENT '是否涉及赔偿' AFTER payment_method;

-- 父子值：惩处类型（一级）→ 惩处类别（二级；经济处罚无子项）
INSERT INTO parent_child_type (code, name, description, status, sort)
SELECT 'PENALTY_TYPE', '惩处类型', '员工档案-惩处记录：惩处类型与惩处类别父子联动', 'ACTIVE', 50
WHERE NOT EXISTS (SELECT 1 FROM parent_child_type WHERE code = 'PENALTY_TYPE');

-- 一级：经济处罚（无子项，惩处类别不显示）
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'PENALTY_TYPE', '', '10', '经济处罚', 'ACTIVE', 10, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'PENALTY_TYPE' AND pci.parent_code = '' AND pci.code = '10'
);

-- 一级：行政处罚
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'PENALTY_TYPE', '', '20', '行政处罚', 'ACTIVE', 20, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'PENALTY_TYPE' AND pci.parent_code = '' AND pci.code = '20'
);

-- 二级：行政处罚 → 解除劳动关系 / 警告 / 记大过 / 记小过
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'PENALTY_TYPE', '20', '21', '解除劳动关系', 'ACTIVE', 21, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'PENALTY_TYPE' AND pci.parent_code = '20' AND pci.code = '21'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'PENALTY_TYPE', '20', '22', '警告', 'ACTIVE', 22, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'PENALTY_TYPE' AND pci.parent_code = '20' AND pci.code = '22'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'PENALTY_TYPE', '20', '23', '记大过', 'ACTIVE', 23, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'PENALTY_TYPE' AND pci.parent_code = '20' AND pci.code = '23'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'PENALTY_TYPE', '20', '24', '记小过', 'ACTIVE', 24, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'PENALTY_TYPE' AND pci.parent_code = '20' AND pci.code = '24'
);

-- 数据字典：扣款方式
INSERT INTO dict_type (code, name, description, status, sort)
SELECT 'PENALTY_PAYMENT_METHOD', '惩处扣款方式', '员工档案-惩处记录：扣款方式', 'ACTIVE', 80
WHERE NOT EXISTS (SELECT 1 FROM dict_type WHERE code = 'PENALTY_PAYMENT_METHOD');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PENALTY_PAYMENT_METHOD', '10', '工资扣款', 'ACTIVE', 10
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PENALTY_PAYMENT_METHOD' AND value = '10');

INSERT INTO dict_item (type_code, value, label, status, sort)
SELECT 'PENALTY_PAYMENT_METHOD', '20', '现金扣款', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'PENALTY_PAYMENT_METHOD' AND value = '20');
