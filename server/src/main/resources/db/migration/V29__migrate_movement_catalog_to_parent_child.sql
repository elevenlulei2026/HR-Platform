-- 1) 父子值配置表升级：支持多层（同一 code 可在不同父节点下复用）+ 扩展字段 ext_json

SET @has_ext_json := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'parent_child_item'
    AND column_name = 'ext_json'
);
SET @sql_add_ext_json := IF(@has_ext_json > 0, 'SELECT 1', 'ALTER TABLE parent_child_item ADD COLUMN ext_json TEXT NULL COMMENT ''扩展属性 JSON（例如 phase 等）''');
PREPARE stmt_add_ext_json FROM @sql_add_ext_json;
EXECUTE stmt_add_ext_json;
DEALLOCATE PREPARE stmt_add_ext_json;

-- parent_code 统一用空串表示根节点，避免 MySQL UNIQUE 对 NULL 的特殊行为
UPDATE parent_child_item SET parent_code = '' WHERE parent_code IS NULL;

SET @parent_code_is_nullable := (
  SELECT CASE WHEN is_nullable = 'YES' THEN 1 ELSE 0 END
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'parent_child_item'
    AND column_name = 'parent_code'
);
SET @sql_fix_parent_code := IF(
  @parent_code_is_nullable = 1,
  'ALTER TABLE parent_child_item MODIFY COLUMN parent_code VARCHAR(32) NOT NULL DEFAULT '''' COMMENT ''父节点 code（根节点为空串）''',
  'SELECT 1'
);
PREPARE stmt_fix_parent_code FROM @sql_fix_parent_code;
EXECUTE stmt_fix_parent_code;
DEALLOCATE PREPARE stmt_fix_parent_code;

-- 唯一键改为：同一 type + 同一 parent + 同一 code 唯一
SET @has_old_uk := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'parent_child_item'
    AND index_name = 'uk_parent_child_item_type_code'
);
SET @sql_drop_old_uk := IF(@has_old_uk > 0, 'ALTER TABLE parent_child_item DROP INDEX uk_parent_child_item_type_code', 'SELECT 1');
PREPARE stmt_drop_old_uk FROM @sql_drop_old_uk;
EXECUTE stmt_drop_old_uk;
DEALLOCATE PREPARE stmt_drop_old_uk;

SET @has_new_uk := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'parent_child_item'
    AND index_name = 'uk_parent_child_item_type_parent_code'
);
SET @sql_add_new_uk := IF(@has_new_uk > 0, 'SELECT 1', 'ALTER TABLE parent_child_item ADD UNIQUE KEY uk_parent_child_item_type_parent_code (type_code, parent_code, code)');
PREPARE stmt_add_new_uk FROM @sql_add_new_uk;
EXECUTE stmt_add_new_uk;
DEALLOCATE PREPARE stmt_add_new_uk;

-- 2) 迁移“职务异动类型”到父子值配置：三级（操作 → 原因 → 原因子项）
-- 约定：typeCode = MOVEMENT_CATALOG

INSERT INTO parent_child_type (code, name, description, status, sort)
SELECT 'MOVEMENT_CATALOG', '职务异动类型', '入转调离操作码/原因码/原因子项（迁移自 movement_*）', 'ACTIVE', 20
WHERE NOT EXISTS (SELECT 1 FROM parent_child_type WHERE code = 'MOVEMENT_CATALOG');

-- 一级：movement_type
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark, ext_json)
SELECT
  'MOVEMENT_CATALOG',
  '',
  mt.code,
  mt.name,
  mt.status,
  mt.sort,
  mt.remark,
  JSON_OBJECT('phase', mt.phase)
FROM movement_type mt
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'MOVEMENT_CATALOG' AND pci.parent_code = '' AND pci.code = mt.code
);

-- 二级：movement_reason（挂到 movement_type.code 下）
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort, remark)
SELECT
  'MOVEMENT_CATALOG',
  mr.movement_type_code,
  mr.code,
  mr.name,
  mr.status,
  mr.sort,
  mr.remark
FROM movement_reason mr
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'MOVEMENT_CATALOG' AND pci.parent_code = mr.movement_type_code AND pci.code = mr.code
);

-- 三级：movement_reason_sub（挂到 movement_reason.code 下）
-- 注意：movement_reason_sub 通过 reason_id 找到 reason.code
INSERT INTO parent_child_item (type_code, parent_code, code, name, status, sort)
SELECT
  'MOVEMENT_CATALOG',
  mr.code,
  mrs.code,
  mrs.name,
  mrs.status,
  mrs.sort
FROM movement_reason_sub mrs
JOIN movement_reason mr ON mr.id = mrs.reason_id
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_item pci
  WHERE pci.type_code = 'MOVEMENT_CATALOG' AND pci.parent_code = mr.code AND pci.code = mrs.code
);

-- 3) 删除旧 movement 目录表（功能迁移完成后不再使用）
DROP TABLE IF EXISTS movement_reason_sub;
DROP TABLE IF EXISTS movement_reason;
DROP TABLE IF EXISTS movement_type;

