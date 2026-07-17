-- Slice 8 修正：入职首节点按「部门负责人」派单（不再用发起人 sys_user.manager_user_id）

UPDATE workflow_definition
SET definition_json = JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT(
        'key', 'manager_approve',
        'name', '部门负责人审批',
        'assigneeRule', JSON_OBJECT('type', 'INITIATOR_SELECT')
      ),
      JSON_OBJECT(
        'key', 'hr_approve',
        'name', 'HR 审批',
        'assigneeRule', JSON_OBJECT('type', 'ROLE', 'roleCode', 'hr')
      ),
      JSON_OBJECT(
        'key', 'final_approve',
        'name', '指定审批人',
        'assigneeRule', JSON_OBJECT('type', 'INITIATOR_SELECT')
      )
    )
  ),
  description = '入职办理顺序审批：部门负责人（按待入职组织） → HR → 发起人自选'
WHERE code = 'onboarding' AND version = 1;

-- 演示：将 manager 账号绑定到一名现任组织负责人，便于待办可登录审批
UPDATE sys_user u
SET u.employee_id = (
  SELECT e.id
  FROM employee e
  JOIN organization o ON o.org_leader_no = e.employee_no
    AND (o.effective_end_date IS NULL OR o.effective_end_date >= CURDATE())
  ORDER BY o.id
  LIMIT 1
)
WHERE u.username = 'manager'
  AND (u.employee_id IS NULL OR u.employee_id = 0)
  AND EXISTS (
    SELECT 1
    FROM employee e
    JOIN organization o ON o.org_leader_no = e.employee_no
      AND (o.effective_end_date IS NULL OR o.effective_end_date >= CURDATE())
  );
