-- Slice 3：权限 RBAC

CREATE TABLE IF NOT EXISTS role (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  data_scope VARCHAR(16) NOT NULL DEFAULT 'ALL',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_role_code (code),
  KEY idx_role_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permission (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(128) NOT NULL,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_permission_code (code),
  KEY idx_permission_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permission (
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  KEY idx_rp_permission_id (permission_id),
  CONSTRAINT fk_rp_role_id FOREIGN KEY (role_id) REFERENCES role(id),
  CONSTRAINT fk_rp_permission_id FOREIGN KEY (permission_id) REFERENCES permission(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_role (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  KEY idx_ur_role_id (role_id),
  CONSTRAINT fk_ur_user_id FOREIGN KEY (user_id) REFERENCES sys_user(id),
  CONSTRAINT fk_ur_role_id FOREIGN KEY (role_id) REFERENCES role(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 角色种子：admin（系统管理员）
INSERT INTO role (code, name, description, status, data_scope)
SELECT 'admin', '系统管理员', '系统初始化角色：拥有全部权限点', 'ACTIVE', 'ALL'
WHERE NOT EXISTS (SELECT 1 FROM role WHERE code = 'admin');

-- 权限点种子（至少覆盖菜单项）
INSERT INTO permission (code, name, description, status)
SELECT 'permission:manage', '权限管理', 'RBAC 权限中心管理', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'permission:manage');

INSERT INTO permission (code, name, description, status)
SELECT 'audit:view', '审计日志查看', '查看审计日志列表', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'audit:view');

INSERT INTO permission (code, name, description, status)
SELECT 'workflow:manage', '流程配置管理', '创建/发布/维护流程定义', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'workflow:manage');

INSERT INTO permission (code, name, description, status)
SELECT 'workflow:task:view', '待办中心查看', '查看与处理待办任务', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'workflow:task:view');

INSERT INTO permission (code, name, description, status)
SELECT 'organization:view', '组织架构查看', '查看组织架构与历史快照', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'organization:view');

INSERT INTO permission (code, name, description, status)
SELECT 'position:view', '岗位体系查看', '查看岗位/职务/职级', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'position:view');

INSERT INTO permission (code, name, description, status)
SELECT 'headcount:view', '编制管理查看', '查看编制计划与使用情况', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'headcount:view');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:roster:view', '花名册查看', '查看员工花名册列表', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:roster:view');

INSERT INTO permission (code, name, description, status)
SELECT 'reporting-line:view', '汇报关系查看', '查看/维护汇报关系（后续切片完善）', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'reporting-line:view');

INSERT INTO permission (code, name, description, status)
SELECT 'onboarding:view', '入职办理查看', '查看入职办理列表', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'onboarding:view');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:movement:view', '人事异动查看', '查看人事异动列表', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:movement:view');

INSERT INTO permission (code, name, description, status)
SELECT 'offboarding:view', '离职办理查看', '查看离职办理列表', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'offboarding:view');

INSERT INTO permission (code, name, description, status)
SELECT 'contract:view', '合同管理查看', '查看合同管理列表', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'contract:view');

-- 默认把 admin 角色绑定到全部已存在权限点
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON 1=1
WHERE r.code = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 默认把 sys_user.admin 分配 admin 角色
INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id
FROM sys_user u
JOIN role r ON r.code = 'admin'
WHERE u.username = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

