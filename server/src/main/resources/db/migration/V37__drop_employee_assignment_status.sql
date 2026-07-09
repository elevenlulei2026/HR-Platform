-- 任职记录移除冗余 status 列，有效性由 effective_start_date / effective_end_date 表达
ALTER TABLE employee_assignment DROP COLUMN status;
