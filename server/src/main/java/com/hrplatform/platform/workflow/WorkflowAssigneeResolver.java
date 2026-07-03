package com.hrplatform.platform.workflow;

import com.hrplatform.platform.auth.SysUserEntity;
import com.hrplatform.platform.auth.SysUserMapper;
import com.hrplatform.platform.rbac.UserRoleMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class WorkflowAssigneeResolver {
  private final SysUserMapper sysUserMapper;
  private final UserRoleMapper userRoleMapper;

  public WorkflowAssigneeResolver(SysUserMapper sysUserMapper, UserRoleMapper userRoleMapper) {
    this.sysUserMapper = sysUserMapper;
    this.userRoleMapper = userRoleMapper;
  }

  public long resolve(
      WorkflowDefinitionModel.WorkflowNodeModel node,
      long initiatorUserId,
      Map<String, Long> nodeAssignees
  ) {
    WorkflowDefinitionModel.WorkflowAssigneeRuleModel rule = node.getAssigneeRule();
    return switch (rule.getType()) {
      case "DIRECT_MANAGER" -> resolveDirectManager(initiatorUserId);
      case "ROLE" -> resolveRole(rule.getRoleCode());
      case "INITIATOR_SELECT" -> resolveInitiatorSelect(node.getKey(), nodeAssignees);
      default -> throw new IllegalArgumentException("不支持的审批人规则: " + rule.getType());
    };
  }

  private long resolveDirectManager(long initiatorUserId) {
    SysUserEntity initiator = sysUserMapper.selectById(initiatorUserId);
    if (initiator == null) {
      throw new IllegalArgumentException("发起人用户不存在");
    }
    Long managerId = initiator.getManagerUserId();
    if (managerId == null) {
      throw new IllegalArgumentException("发起人未配置直属上级，无法解析 DIRECT_MANAGER 节点");
    }
    SysUserEntity manager = sysUserMapper.selectById(managerId);
    if (manager == null || !"ACTIVE".equals(manager.getStatus())) {
      throw new IllegalArgumentException("直属上级用户不存在或已停用");
    }
    return managerId;
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

  private long resolveInitiatorSelect(String nodeKey, Map<String, Long> nodeAssignees) {
    if (nodeAssignees == null || !nodeAssignees.containsKey(nodeKey)) {
      throw new IllegalArgumentException("节点 " + nodeKey + " 需要发起人指定审批人");
    }
    Long assigneeId = nodeAssignees.get(nodeKey);
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
