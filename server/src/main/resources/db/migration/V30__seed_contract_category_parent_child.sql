-- 合同类别：写入父子值配置（两级目录）
-- typeCode: CONTRACT_CATEGORY
-- 根节点 parent_code 使用空串 ''（对齐 V29 约定）

INSERT INTO parent_child_type (code, name, description, status, sort)
SELECT 'CONTRACT_CATEGORY', '合同类别', '合同/协议类别（父子联动）', 'ACTIVE', 30
WHERE NOT EXISTS (SELECT 1 FROM parent_child_type WHERE code = 'CONTRACT_CATEGORY');

-- 一级：父项（根节点）
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '', '40', '实习协议', 'ACTIVE', 40, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '' AND pci.code = '40'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '', '50', '退休返聘协议', 'ACTIVE', 50, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '' AND pci.code = '50'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '', '60', '劳动合同', 'ACTIVE', 60, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '' AND pci.code = '60'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '', '70', '导购合同', 'ACTIVE', 70, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '' AND pci.code = '70'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '', '80', '劳务协议', 'ACTIVE', 80, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '' AND pci.code = '80'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '', '90', '兼职协议', 'ACTIVE', 90, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '' AND pci.code = '90'
);

-- 二级：子项（挂到父项 code 下）
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '40', '170', '实习协议', 'ACTIVE', 170, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '40' AND pci.code = '170'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '50', '180', '退休返聘协议', 'ACTIVE', 180, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '50' AND pci.code = '180'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '60', '110', '固定期限劳动合同', 'ACTIVE', 110, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '60' AND pci.code = '110'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '60', '120', '无固定期限劳动合同', 'ACTIVE', 120, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '60' AND pci.code = '120'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '60', '130', '以一定任务为期限的劳动合同', 'ACTIVE', 130, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '60' AND pci.code = '130'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '70', '140', '固定期限劳动合同', 'ACTIVE', 140, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '70' AND pci.code = '140'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '70', '150', '无固定期限劳动合同', 'ACTIVE', 150, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '70' AND pci.code = '150'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '70', '160', '以一定任务为期限的劳动合同', 'ACTIVE', 160, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '70' AND pci.code = '160'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '80', '190', '劳务协议', 'ACTIVE', 190, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '80' AND pci.code = '190'
);

INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT 'CONTRACT_CATEGORY', '90', '200', '兼职协议', 'ACTIVE', 200, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'CONTRACT_CATEGORY' AND pci.parent_code = '90' AND pci.code = '200'
);

