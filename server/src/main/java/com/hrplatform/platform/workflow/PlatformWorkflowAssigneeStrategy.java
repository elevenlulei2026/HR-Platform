package com.hrplatform.platform.workflow;

import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.auth.SysUserMapper;
import com.hrplatform.platform.rbac.UserRoleMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
public class PlatformWorkflowAssigneeStrategy implements WorkflowAssigneeStrategy {
  private final SysUserMapper sysUserMapper;
  private final UserRoleMapper userRoleMapper;

  public PlatformWorkflowAssigneeStrategy(SysUserMapper sysUserMapper, UserRoleMapper userRoleMapper) {
    this.sysUserMapper = sysUserMapper;
    this.userRoleMapper = userRoleMapper;
  }

  @Override
  public Set<String> supportedTypes() {
    return Set.of("ROLE", "INITIATOR_SELECT");
  }

  @Override
  public long resolve(
      WorkflowDefinitionModel.WorkflowNodeModel node,
      WorkflowAssigneeResolveContext context
  ) {
    WorkflowDefinitionModel.WorkflowAssigneeRuleModel rule = node.getAssigneeRule();
    return switch (rule.getType()) {
      case "ROLE" -> resolveRole(rule.getRoleCode());
      case "INITIATOR_SELECT" -> resolveInitiatorSelect(node.getKey(), context);
      default -> throw new IllegalArgumentException("不支持的审批人规则: " + rule.getType());
    };
  }

  private long resolveRole(String roleCode) {
    if (roleCode == null || roleCode.isBlank()) {
      throw new IllegalArgumentException("ROLE 规则缺少 roleCode");
    }
    List<Long> userIds = userRoleMapper.selectActiveUserIdsByRoleCode(roleCode);
    if (userIds == null || userIds.isEmpty()) {
      throw new IllegalArgumentException("角色 " + roleCode + " 下没有可用审批人");
    }
    return userIds.get(0);
  }

  private long resolveInitiatorSelect(String nodeKey, WorkflowAssigneeResolveContext context) {
    if (!context.getNodeAssignees().containsKey(nodeKey)) {
      throw new IllegalArgumentException("节点 " + nodeKey + " 需要发起人指定审批人");
    }
    Long assigneeId = context.getNodeAssignees().get(nodeKey);
    if (assigneeId == null) {
      throw new IllegalArgumentException("节点 " + nodeKey + " 的审批人不能为空");
    }
    SysUserEntity user = sysUserMapper.selectById(assigneeId);
    if (user == null || !"ACTIVE".equals(user.getStatus())) {
      throw new IllegalArgumentException("指定审批人不存在或已停用");
    }
    return assigneeId;
  }
}
