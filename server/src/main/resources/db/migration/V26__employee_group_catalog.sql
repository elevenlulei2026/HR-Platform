-- 员工组 / 员工子组两级目录

CREATE TABLE IF NOT EXISTS employee_group (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(8) NOT NULL,
  name VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_employee_group_code (code),
  KEY idx_employee_group_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_subgroup (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_group_code VARCHAR(8) NOT NULL,
  code VARCHAR(8) NOT NULL,
  name VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  sort INT NOT NULL DEFAULT 0,
  remark VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_employee_subgroup_group_code (employee_group_code, code),
  KEY idx_employee_subgroup_group (employee_group_code),
  KEY idx_employee_subgroup_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 员工组
INSERT INTO employee_group (code, name, status, sort)
SELECT '10', '正式员工', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM employee_group WHERE code = '10');
INSERT INTO employee_group (code, name, status, sort)
SELECT '20', '实习生', 'ACTIVE', 20 WHERE NOT EXISTS (SELECT 1 FROM employee_group WHERE code = '20');
INSERT INTO employee_group (code, name, status, sort)
SELECT '30', '退休返聘', 'ACTIVE', 30 WHERE NOT EXISTS (SELECT 1 FROM employee_group WHERE code = '30');
INSERT INTO employee_group (code, name, status, sort)
SELECT '40', '劳务人员', 'ACTIVE', 40 WHERE NOT EXISTS (SELECT 1 FROM employee_group WHERE code = '40');
INSERT INTO employee_group (code, name, status, sort)
SELECT '50', '外包人员', 'ACTIVE', 50 WHERE NOT EXISTS (SELECT 1 FROM employee_group WHERE code = '50');
INSERT INTO employee_group (code, name, status, sort)
SELECT '60', '兼职人员', 'ACTIVE', 60 WHERE NOT EXISTS (SELECT 1 FROM employee_group WHERE code = '60');
INSERT INTO employee_group (code, name, status, sort)
SELECT '70', '外部协作人员', 'ACTIVE', 70 WHERE NOT EXISTS (SELECT 1 FROM employee_group WHERE code = '70');

-- 员工子组：正式员工
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '10', '1001', '职员', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '10' AND code = '1001');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '10', '1002', '直接工人', 'ACTIVE', 20 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '10' AND code = '1002');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '10', '1003', '间接工人', 'ACTIVE', 30 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '10' AND code = '1003');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '10', '1004', '留用导购员', 'ACTIVE', 40 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '10' AND code = '1004');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '10', '1005', '客服', 'ACTIVE', 50 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '10' AND code = '1005');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '10', '1006', '售后服务', 'ACTIVE', 60 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '10' AND code = '1006');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '10', '1007', '后勤服务', 'ACTIVE', 70 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '10' AND code = '1007');

-- 员工子组：实习生
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '20', '2001', '临时实习生', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '20' AND code = '2001');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '20', '2002', '长期实习生', 'ACTIVE', 20 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '20' AND code = '2002');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '20', '2003', '大促月薪实习生', 'ACTIVE', 30 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '20' AND code = '2003');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '20', '2004', '大促时薪实习生', 'ACTIVE', 40 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '20' AND code = '2004');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '20', '2005', '外包社会工', 'ACTIVE', 50 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '20' AND code = '2005');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '20', '2006', '外包学生工', 'ACTIVE', 60 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '20' AND code = '2006');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '20', '2007', '平移导购员', 'ACTIVE', 70 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '20' AND code = '2007');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '20', '2008', '业务外包人员', 'ACTIVE', 80 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '20' AND code = '2008');

-- 员工子组：退休返聘
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '30', '3001', '职员', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '30' AND code = '3001');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '30', '3002', '直接工人', 'ACTIVE', 20 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '30' AND code = '3002');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '30', '3003', '间接工人', 'ACTIVE', 30 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '30' AND code = '3003');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '30', '3004', '留用导购员', 'ACTIVE', 40 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '30' AND code = '3004');

-- 员工子组：劳务人员
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '40', '4001', '劳务人员', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '40' AND code = '4001');

-- 员工子组：外包人员
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '50', '5001', '外包社会工', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '50' AND code = '5001');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '50', '5002', '外包学生工', 'ACTIVE', 20 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '50' AND code = '5002');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '50', '5003', '业务外包人员', 'ACTIVE', 30 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '50' AND code = '5003');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '50', '5004', '平移导购员', 'ACTIVE', 40 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '50' AND code = '5004');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '50', '5005', '研发外包人员', 'ACTIVE', 50 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '50' AND code = '5005');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '50', '5006', '平移导购员-直营', 'ACTIVE', 60 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '50' AND code = '5006');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '50', '5007', '平移导购员-直派', 'ACTIVE', 70 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '50' AND code = '5007');
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '50', '5008', '外包农民工', 'ACTIVE', 80 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '50' AND code = '5008');

-- 员工子组：兼职人员
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '60', '6001', '兼职人员', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '60' AND code = '6001');

-- 员工子组：外部协作人员
INSERT INTO employee_subgroup (employee_group_code, code, name, status, sort)
SELECT '70', '7001', '外部协作人员', 'ACTIVE', 10 WHERE NOT EXISTS (SELECT 1 FROM employee_subgroup WHERE employee_group_code = '70' AND code = '7001');
