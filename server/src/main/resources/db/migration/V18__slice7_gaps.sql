-- Slice 7 缺口补齐：异动字典、任职司龄、HR 敏感权限

-- =========================================================
-- 1) employee_assignment：司龄冗余列 + 集团工龄起算日
-- =========================================================
ALTER TABLE employee_assignment ADD COLUMN tenure_on_position VARCHAR(64) NULL COMMENT '在岗时间（冗余）';
ALTER TABLE employee_assignment ADD COLUMN company_tenure VARCHAR(64) NULL COMMENT '司龄（冗余）';
ALTER TABLE employee_assignment ADD COLUMN group_seniority_start_date DATE NULL COMMENT '集团工龄开始日期';

-- =========================================================
-- 2) MOVEMENT_REASON 有效码种子（§4.7 / 员工档案异动要求）
-- =========================================================

-- SPR 雇佣类型变更
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'SP1', '临时工转正', 'ACTIVE', 25, JSON_OBJECT('movementType', 'SPR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'SP1');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'SP2', '实习生转正', 'ACTIVE', 26, JSON_OBJECT('movementType', 'SPR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'SP2');

-- PRO 晋升晋级
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PR1', '管理干部任命', 'ACTIVE', 35, JSON_OBJECT('movementType', 'PRO')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PR1');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PR2', '晋升', 'ACTIVE', 36, JSON_OBJECT('movementType', 'PRO')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PR2');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PR3', '晋级', 'ACTIVE', 37, JSON_OBJECT('movementType', 'PRO')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PR3');

-- DEM 降职降级
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'D01', '降职', 'ACTIVE', 38, JSON_OBJECT('movementType', 'DEM')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'D01');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'D02', '降级', 'ACTIVE', 39, JSON_OBJECT('movementType', 'DEM')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'D02');

-- DTA 数据更改
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'DT1', '责任制变更', 'ACTIVE', 61, JSON_OBJECT('movementType', 'DTA')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'DT1');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'DT2', '历史数据更正', 'ACTIVE', 62, JSON_OBJECT('movementType', 'DTA')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'DT2');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'DT3', '上线数据修正', 'ACTIVE', 63, JSON_OBJECT('movementType', 'DTA')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'DT3');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'DT5', '岗位数据同步', 'ACTIVE', 65, JSON_OBJECT('movementType', 'DTA')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'DT5');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'DT6', '试用期转正意见更新', 'ACTIVE', 66, JSON_OBJECT('movementType', 'DTA')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'DT6');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'DT7', '合同续签意见更新', 'ACTIVE', 67, JSON_OBJECT('movementType', 'DTA')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'DT7');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'DT8', '组织负责人变更', 'ACTIVE', 68, JSON_OBJECT('movementType', 'DTA')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'DT8');

-- XFR 调动 X03–X14
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X03', '跨事业部调动', 'ACTIVE', 43, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X03');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X04', '跨体系调动', 'ACTIVE', 44, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X04');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X05', '跨区域调动', 'ACTIVE', 45, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X05');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X06', '管培生定岗', 'ACTIVE', 46, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X06');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X07', '跨事业群调动', 'ACTIVE', 47, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X07');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X08', '跨法人公司调动', 'ACTIVE', 48, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X08');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X09', '跨产品线活水', 'ACTIVE', 49, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X09');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X10', '国际活水', 'ACTIVE', 50, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X10');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X11', '国内跨区域活水', 'ACTIVE', 51, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X11');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X12', '跨大职能活水', 'ACTIVE', 52, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X12');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X13', '敏感岗位轮岗', 'ACTIVE', 53, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X13');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'X14', '其他活水', 'ACTIVE', 54, JSON_OBJECT('movementType', 'XFR')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'X14');

-- PAY 调薪
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PA', '晋升调薪', 'ACTIVE', 70, JSON_OBJECT('movementType', 'PAY')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PA');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PB', '转正调薪', 'ACTIVE', 71, JSON_OBJECT('movementType', 'PAY')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PB');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PC', '转岗调薪', 'ACTIVE', 72, JSON_OBJECT('movementType', 'PAY')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PC');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PD', '年度调薪', 'ACTIVE', 73, JSON_OBJECT('movementType', 'PAY')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PD');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PE', '绩效调薪', 'ACTIVE', 74, JSON_OBJECT('movementType', 'PAY')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PE');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'PO', '其他调薪', 'ACTIVE', 75, JSON_OBJECT('movementType', 'PAY')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'PO');

-- TER 离职 TC–TH
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'TC', '结束兼职', 'ACTIVE', 52, JSON_OBJECT('movementType', 'TER')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'TC');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'TD', '退休', 'ACTIVE', 53, JSON_OBJECT('movementType', 'TER')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'TD');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'TE', '死亡', 'ACTIVE', 54, JSON_OBJECT('movementType', 'TER')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'TE');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'TF', '从集团内部转调', 'ACTIVE', 55, JSON_OBJECT('movementType', 'TER')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'TF');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'TG', '放弃报到', 'ACTIVE', 56, JSON_OBJECT('movementType', 'TER')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'TG');
INSERT INTO dict_item (type_code, value, label, status, sort, ext_json)
SELECT 'MOVEMENT_REASON', 'TH', '入职当天离职', 'ACTIVE', 57, JSON_OBJECT('movementType', 'TER')
WHERE NOT EXISTS (SELECT 1 FROM dict_item WHERE type_code = 'MOVEMENT_REASON' AND value = 'TH');

-- =========================================================
-- 3) HR 角色授予敏感字段查看权限
-- =========================================================
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code = 'employee:sensitive:view'
WHERE r.code = 'hr'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
