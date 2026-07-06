-- 修复失败的 V16 迁移（因 position 为 MySQL 保留字导致首次执行失败）
-- 在 MySQL 客户端执行本脚本后，重新启动 server 即可自动重跑 V16。

DELETE FROM flyway_schema_history WHERE version = '16' AND success = 0;

DROP TABLE IF EXISTS employee_id_document;
DROP TABLE IF EXISTS employee_assignment;
DROP TABLE IF EXISTS reporting_line;
DROP TABLE IF EXISTS employee_movement;
DROP TABLE IF EXISTS employee;
