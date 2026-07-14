-- 修复样例数据：组织与任职上的 HRBP/SSC/人资协调必须指向花名册真实工号
-- 来源：HRBP 部(20000271)、员工关系部兼 SSC(20000272)、HR COE 人资协调(20000270)

-- 1) 组织主数据
UPDATE organization o
JOIN (
  SELECT employee_no,
         ROW_NUMBER() OVER (ORDER BY employee_no) AS rn,
         COUNT(*) OVER () AS cnt
  FROM (
    SELECT e.employee_no
    FROM employee e
    JOIN employee_assignment a ON a.employee_id = e.id AND a.is_primary = 1 AND a.effective_end_date IS NULL
    JOIN organization ho ON ho.id = a.organization_id AND ho.effective_end_date IS NULL
    WHERE ho.code = '20000271'
  ) src
) bp ON MOD(o.id - 1, bp.cnt) + 1 = bp.rn
SET o.hrbp_no = bp.employee_no
WHERE o.effective_end_date IS NULL
  AND bp.cnt > 0;

UPDATE organization o
JOIN (
  SELECT employee_no,
         ROW_NUMBER() OVER (ORDER BY employee_no) AS rn,
         COUNT(*) OVER () AS cnt
  FROM (
    SELECT e.employee_no
    FROM employee e
    JOIN employee_assignment a ON a.employee_id = e.id AND a.is_primary = 1 AND a.effective_end_date IS NULL
    JOIN organization ho ON ho.id = a.organization_id AND ho.effective_end_date IS NULL
    WHERE ho.code = '20000272'
  ) src
) sc ON MOD(o.id - 1, sc.cnt) + 1 = sc.rn
SET o.ssc_no = sc.employee_no
WHERE o.effective_end_date IS NULL
  AND sc.cnt > 0;

UPDATE organization o
JOIN (
  SELECT employee_no,
         ROW_NUMBER() OVER (ORDER BY employee_no) AS rn,
         COUNT(*) OVER () AS cnt
  FROM (
    SELECT e.employee_no
    FROM employee e
    JOIN employee_assignment a ON a.employee_id = e.id AND a.is_primary = 1 AND a.effective_end_date IS NULL
    JOIN organization ho ON ho.id = a.organization_id AND ho.effective_end_date IS NULL
    WHERE ho.code = '20000270'
  ) src
) hc ON MOD(o.id - 1, hc.cnt) + 1 = hc.rn
SET o.hr_coordinator_no = hc.employee_no
WHERE o.effective_end_date IS NULL
  AND hc.cnt > 0;

-- 2) 任职记录上的工作关系字段
UPDATE employee_assignment a
JOIN (
  SELECT employee_no,
         ROW_NUMBER() OVER (ORDER BY employee_no) AS rn,
         COUNT(*) OVER () AS cnt
  FROM (
    SELECT e.employee_no
    FROM employee e
    JOIN employee_assignment x ON x.employee_id = e.id AND x.is_primary = 1 AND x.effective_end_date IS NULL
    JOIN organization ho ON ho.id = x.organization_id AND ho.effective_end_date IS NULL
    WHERE ho.code = '20000271'
  ) src
) bp ON MOD(a.id - 1, bp.cnt) + 1 = bp.rn
SET a.hrbp_no = bp.employee_no
WHERE a.effective_end_date IS NULL
  AND bp.cnt > 0;

UPDATE employee_assignment a
JOIN (
  SELECT employee_no,
         ROW_NUMBER() OVER (ORDER BY employee_no) AS rn,
         COUNT(*) OVER () AS cnt
  FROM (
    SELECT e.employee_no
    FROM employee e
    JOIN employee_assignment x ON x.employee_id = e.id AND x.is_primary = 1 AND x.effective_end_date IS NULL
    JOIN organization ho ON ho.id = x.organization_id AND ho.effective_end_date IS NULL
    WHERE ho.code = '20000272'
  ) src
) sc ON MOD(a.id - 1, sc.cnt) + 1 = sc.rn
SET a.ssc_no = sc.employee_no
WHERE a.effective_end_date IS NULL
  AND sc.cnt > 0;

UPDATE employee_assignment a
JOIN (
  SELECT employee_no,
         ROW_NUMBER() OVER (ORDER BY employee_no) AS rn,
         COUNT(*) OVER () AS cnt
  FROM (
    SELECT e.employee_no
    FROM employee e
    JOIN employee_assignment x ON x.employee_id = e.id AND x.is_primary = 1 AND x.effective_end_date IS NULL
    JOIN organization ho ON ho.id = x.organization_id AND ho.effective_end_date IS NULL
    WHERE ho.code = '20000270'
  ) src
) hc ON MOD(a.id - 1, hc.cnt) + 1 = hc.rn
SET a.hr_coordinator_no = hc.employee_no
WHERE a.effective_end_date IS NULL
  AND hc.cnt > 0;
