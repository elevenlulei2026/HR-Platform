-- Slice 1：认证与审计基础

CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  employee_id BIGINT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  UNIQUE KEY uk_sys_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action VARCHAR(16) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NULL,
  operator_user_id BIGINT NULL,
  operator_username VARCHAR(64) NULL,
  ip_address VARCHAR(64) NULL,
  trace_id VARCHAR(64) NULL,
  detail_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_log_created_at (created_at),
  KEY idx_audit_log_operator_username (operator_username),
  KEY idx_audit_log_action (action),
  KEY idx_audit_log_resource_type (resource_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- admin 种子账号：用户名 admin，密码 admin123（sha256，前缀用于兼容后续升级 BCrypt）
INSERT INTO sys_user (username, password_hash, status)
SELECT 'admin', CONCAT('sha256:', SHA2('admin123', 256)), 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'admin');

