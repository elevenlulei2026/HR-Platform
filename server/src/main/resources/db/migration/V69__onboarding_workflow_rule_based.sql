-- 入职流程改为纯规则派单：去掉发起人自选（final_approve / INITIATOR_SELECT）
-- 审批人由流程引擎按组织负责人、系统角色解析；节点可在「流程定义」中继续调整

UPDATE workflow_definition
SET definition_json = JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT(
        'key', 'org_leader',
        'name', '组织负责人审批',
        'assigneeRule', JSON_OBJECT('type', 'ORG_LEADER')
      ),
      JSON_OBJECT(
        'key', 'hr_approve',
        'name', 'HR 审批',
        'assigneeRule', JSON_OBJECT('type', 'ROLE', 'roleCode', 'hr')
      )
    )
  ),
  description = '入职办理顺序审批：组织负责人 → HR（均由流程规则自动派单）'
WHERE code = 'onboarding'
  AND (
    definition_json LIKE '%final_approve%'
    OR definition_json LIKE '%manager_approve%'
  );
