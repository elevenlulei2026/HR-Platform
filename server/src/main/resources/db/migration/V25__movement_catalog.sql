-- 职务异动类型三级目录：操作 / 原因 / 原因子项

CREATE TABLE IF NOT EXISTS movement_type (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(8) NOT NULL,
  name VARCHAR(64) NOT NULL,
  phase VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_movement_type_code (code),
  KEY idx_movement_type_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS movement_reason (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  movement_type_code VARCHAR(8) NOT NULL,
  code VARCHAR(8) NOT NULL,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_movement_reason_type_code (movement_type_code, code),
  KEY idx_movement_reason_type (movement_type_code),
  KEY idx_movement_reason_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS movement_reason_sub (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reason_id BIGINT NOT NULL,
  code VARCHAR(8) NOT NULL,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_movement_reason_sub (reason_id, code),
  KEY idx_movement_reason_sub_reason (reason_id),
  KEY idx_movement_reason_sub_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 操作码
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'HIR', '雇佣', 'HIRE', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'HIR');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'REH', '重新雇佣', 'HIRE', 'ACTIVE', 20 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'REH');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'PRC', '转正', 'CHANGE', 'ACTIVE', 30 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'PRC');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'SPR', '雇佣类型变更', 'CHANGE', 'ACTIVE', 40 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'SPR');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'PRO', '晋升晋级', 'CHANGE', 'ACTIVE', 50 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'PRO');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'DEM', '降职降级', 'CHANGE', 'ACTIVE', 60 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'DEM');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'DTA', '数据更改', 'CHANGE', 'ACTIVE', 70 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'DTA');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'XFR', '调动', 'CHANGE', 'ACTIVE', 80 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'XFR');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'PAY', '调薪', 'CHANGE', 'ACTIVE', 90 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'PAY');
INSERT INTO movement_type (code, name, phase, status, sort)
SELECT 'TER', '离职', 'LEAVE', 'ACTIVE', 100 WHERE NOT EXISTS (SELECT 1 FROM movement_type WHERE code = 'TER');

-- 有效原因码
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'HIR', 'H01', '初次入职', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='HIR' AND code='H01');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'HIR', 'H02', '开始兼职', 'ACTIVE', 11 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='HIR' AND code='H02');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'REH', 'R01', '离职后入职', 'ACTIVE', 20 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='REH' AND code='R01');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'REH', 'R02', '退休返聘', 'ACTIVE', 21 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='REH' AND code='R02');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PRC', 'P01', '正常转正', 'ACTIVE', 30 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PRC' AND code='P01');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PRC', 'P02', '提前转正', 'ACTIVE', 31 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PRC' AND code='P02');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PRC', 'P03', '延迟转正', 'ACTIVE', 32 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PRC' AND code='P03');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'SPR', 'SP1', '临时工转正', 'ACTIVE', 25 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='SPR' AND code='SP1');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'SPR', 'SP2', '实习生转正', 'ACTIVE', 26 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='SPR' AND code='SP2');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'SPR', 'SP3', '非正式工转正', 'ACTIVE', 27 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='SPR' AND code='SP3');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'SPR', 'SP4', '正式转非正式', 'ACTIVE', 28 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='SPR' AND code='SP4');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PRO', 'PR1', '管理干部任命', 'ACTIVE', 35 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PRO' AND code='PR1');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PRO', 'PR2', '晋升', 'ACTIVE', 36 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PRO' AND code='PR2');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PRO', 'PR3', '晋级', 'ACTIVE', 37 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PRO' AND code='PR3');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DEM', 'D01', '降职', 'ACTIVE', 38 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DEM' AND code='D01');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DEM', 'D02', '降级', 'ACTIVE', 39 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DEM' AND code='D02');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DTA', 'DT1', '责任制变更', 'ACTIVE', 61 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DTA' AND code='DT1');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DTA', 'DT2', '历史数据更正', 'ACTIVE', 62 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DTA' AND code='DT2');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DTA', 'DT3', '上线数据修正', 'ACTIVE', 63 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DTA' AND code='DT3');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DTA', 'DT4', '其他', 'ACTIVE', 64 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DTA' AND code='DT4');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DTA', 'DT5', '岗位数据同步', 'ACTIVE', 65 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DTA' AND code='DT5');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DTA', 'DT6', '试用期转正意见更新', 'ACTIVE', 66 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DTA' AND code='DT6');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DTA', 'DT7', '合同续签意见更新', 'ACTIVE', 67 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DTA' AND code='DT7');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'DTA', 'DT8', '组织负责人变更', 'ACTIVE', 68 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='DTA' AND code='DT8');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X01', '部门内调动', 'ACTIVE', 40 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X01');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X02', '跨部门调动', 'ACTIVE', 41 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X02');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X03', '跨事业部调动', 'ACTIVE', 43 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X03');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X04', '跨体系调动', 'ACTIVE', 44 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X04');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X05', '跨区域调动', 'ACTIVE', 45 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X05');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X06', '管培生定岗', 'ACTIVE', 46 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X06');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X07', '跨事业群调动', 'ACTIVE', 47 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X07');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X08', '跨法人公司调动', 'ACTIVE', 48 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X08');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X09', '跨产品线活水', 'ACTIVE', 49 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X09');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X10', '国际活水', 'ACTIVE', 50 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X10');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X11', '国内跨区域活水', 'ACTIVE', 51 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X11');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X12', '跨大职能活水', 'ACTIVE', 52 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X12');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X13', '敏感岗位轮岗', 'ACTIVE', 53 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X13');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'XFR', 'X14', '其他活水', 'ACTIVE', 54 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='XFR' AND code='X14');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PA', '晋升调薪', 'ACTIVE', 70 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PA');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PB', '转正调薪', 'ACTIVE', 71 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PB');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PC', '转岗调薪', 'ACTIVE', 72 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PC');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PD', '年度调薪', 'ACTIVE', 73 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PD');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PE', '绩效调薪', 'ACTIVE', 74 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PE');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PO', '其他', 'ACTIVE', 75 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PO');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'TA', '主动离职', 'ACTIVE', 50 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='TA');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'TB', '被动离职', 'ACTIVE', 51 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='TB');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'TC', '结束兼职', 'ACTIVE', 52 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='TC');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'TD', '退休', 'ACTIVE', 53 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='TD');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'TE', '死亡', 'ACTIVE', 54 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='TE');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'TF', '从集团内部转调', 'ACTIVE', 55 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='TF');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'TG', '放弃报到', 'ACTIVE', 56 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='TG');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'TH', '入职当天离职', 'ACTIVE', 57 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='TH');

-- 失效原因码（历史只读）
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PA1', '晋升调薪', 'DISABLED', 80 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PA1');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PA2', '转正调薪', 'DISABLED', 81 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PA2');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PA3', '转岗调薪', 'DISABLED', 82 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PA3');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PA4', '年度调薪', 'DISABLED', 83 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PA4');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PA5', '绩效调薪', 'DISABLED', 84 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PA5');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'PAY', 'PA6', '其他', 'DISABLED', 85 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='PAY' AND code='PA6');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T01', '主动离职-身体原因', 'DISABLED', 101 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T01');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T02', '主动离职-家庭原因', 'DISABLED', 102 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T02');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T03', '主动离职-个人职业发展规划', 'DISABLED', 103 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T03');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T06', '主动离职-部门内部管理问题', 'DISABLED', 106 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T06');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T07', '主动离职-工作时间长', 'DISABLED', 107 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T07');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T08', '主动离职-工作压力大', 'DISABLED', 108 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T08');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T09', '主动离职-薪资福利待遇', 'DISABLED', 109 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T09');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T14', '被动离职-双方协商解除', 'DISABLED', 114 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T14');
INSERT INTO movement_reason (movement_type_code, code, name, status, sort)
SELECT 'TER', 'T21', '被动离职-部门管理/劝退', 'DISABLED', 121 WHERE NOT EXISTS (SELECT 1 FROM movement_reason WHERE movement_type_code='TER' AND code='T21');

-- 有效原因子项
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '10', '跨级晋升', 'ACTIVE', 10 FROM movement_reason r
WHERE r.movement_type_code='PRO' AND r.code='PR2'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='10');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '20', '逐级晋升', 'ACTIVE', 20 FROM movement_reason r
WHERE r.movement_type_code='PRO' AND r.code='PR2'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='20');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '10', '跨级晋级', 'ACTIVE', 10 FROM movement_reason r
WHERE r.movement_type_code='PRO' AND r.code='PR3'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='10');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '20', '逐级晋级', 'ACTIVE', 20 FROM movement_reason r
WHERE r.movement_type_code='PRO' AND r.code='PR3'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='20');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '10', '不满足任职资格要求', 'ACTIVE', 10 FROM movement_reason r
WHERE r.movement_type_code='DEM' AND r.code='D01'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='10');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '20', '重大违纪过失', 'ACTIVE', 20 FROM movement_reason r
WHERE r.movement_type_code='DEM' AND r.code='D01'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='20');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '10', '不满足任职资格要求', 'ACTIVE', 10 FROM movement_reason r
WHERE r.movement_type_code='DEM' AND r.code='D02'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='10');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '20', '重大违纪过失', 'ACTIVE', 20 FROM movement_reason r
WHERE r.movement_type_code='DEM' AND r.code='D02'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='20');

-- 失效原因子项（历史只读）
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '11', '身体不适', 'DISABLED', 11 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T01'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='11');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '10', '怀孕', 'DISABLED', 10 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T01'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='10');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '23', '寻找离家近的工作机会', 'DISABLED', 23 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T02'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='23');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '30', '回老家发展', 'DISABLED', 30 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T02'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='30');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '20', '照顾家人', 'DISABLED', 20 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T02'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='20');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '21', '结婚', 'DISABLED', 21 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T02'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='21');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '34', '换城市', 'DISABLED', 34 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T03'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='34');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '30', '学习深造', 'DISABLED', 30 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T03'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='30');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '35', '不胜任现有工作', 'DISABLED', 35 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T03'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='35');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '33', '换行业', 'DISABLED', 33 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T03'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='33');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '32', '更好的职业机会', 'DISABLED', 32 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T03'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='32');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '31', '创业', 'DISABLED', 31 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T03'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='31');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '61', '主管管理问题', 'DISABLED', 61 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T06'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='61');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '60', '工作氛围不融洽', 'DISABLED', 60 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T06'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='60');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '72', '倒班/夜班', 'DISABLED', 72 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T07'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='72');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '71', '加班多', 'DISABLED', 71 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T07'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='71');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '81', '站立作业', 'DISABLED', 81 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T08'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='81');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '80', '工作强度大', 'DISABLED', 80 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T08'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='80');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '82', '工作要求高', 'DISABLED', 82 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T08'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='82');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '83', '业绩指标高', 'DISABLED', 83 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T08'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='83');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '90', '工资低', 'DISABLED', 90 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T09'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='90');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '91', '福利低', 'DISABLED', 91 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T09'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='91');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '142', '协商解除公司提出', 'DISABLED', 142 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T14'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='142');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '144', '医疗期协商解除', 'DISABLED', 144 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T14'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='144');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '141', '合同到期公司不续签', 'DISABLED', 141 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T14'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='141');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '143', '工伤协商解除', 'DISABLED', 143 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T14'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='143');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '145', '无经济补偿金', 'DISABLED', 145 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T14'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='145');
INSERT INTO movement_reason_sub (reason_id, code, name, status, sort)
SELECT r.id, '211', '无经济补偿金', 'DISABLED', 211 FROM movement_reason r WHERE r.movement_type_code='TER' AND r.code='T21'
AND NOT EXISTS (SELECT 1 FROM movement_reason_sub s WHERE s.reason_id=r.id AND s.code='211');

-- 停用旧字典类型 MOVEMENT_REASON（已迁移至专用表）
UPDATE dict_type SET status = 'DISABLED' WHERE code = 'MOVEMENT_REASON';
