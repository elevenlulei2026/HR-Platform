package com.hrplatform.platform.workflow;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@JsonIgnoreProperties(ignoreUnknown = true)
public class WorkflowDefinitionModel {
  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final Set<String> ALLOWED_TYPES = Set.of(
      "DIRECT_MANAGER",
      "REPORTING_LINE",
      "ORG_LEADER",
      "ORG_HRBP",
      "ORG_SSC",
      "ORG_HR_COORDINATOR",
      "ROLE",
      "INITIATOR_SELECT"
  );

  private List<WorkflowNodeModel> nodes = new ArrayList<>();

  public List<WorkflowNodeModel> getNodes() {
    return nodes;
  }

  public void setNodes(List<WorkflowNodeModel> nodes) {
    this.nodes = nodes == null ? new ArrayList<>() : nodes;
  }

  public static WorkflowDefinitionModel parse(String json) {
    if (json == null || json.isBlank()) {
      throw new IllegalArgumentException("流程定义 JSON 不能为空");
    }
    try {
      WorkflowDefinitionModel model = MAPPER.readValue(json, WorkflowDefinitionModel.class);
      validate(model);
      return model;
    } catch (JsonProcessingException e) {
      throw new IllegalArgumentException("流程定义 JSON 格式无效");
    }
  }

  public static String toJson(WorkflowDefinitionModel model) {
    validate(model);
    try {
      return MAPPER.writeValueAsString(model);
    } catch (JsonProcessingException e) {
      throw new IllegalArgumentException("流程定义 JSON 序列化失败");
    }
  }

  public static void validate(WorkflowDefinitionModel model) {
    if (model == null || model.nodes == null || model.nodes.isEmpty()) {
      throw new IllegalArgumentException("流程定义至少包含一个审批节点");
    }
    for (int i = 0; i < model.nodes.size(); i++) {
      WorkflowNodeModel node = model.nodes.get(i);
      if (node.getKey() == null || node.getKey().isBlank()) {
        throw new IllegalArgumentException("第 " + (i + 1) + " 个节点 key 不能为空");
      }
      if (node.getName() == null || node.getName().isBlank()) {
        throw new IllegalArgumentException("第 " + (i + 1) + " 个节点 name 不能为空");
      }
      WorkflowAssigneeRuleModel rule = node.getAssigneeRule();
      if (rule == null || rule.getType() == null || rule.getType().isBlank()) {
        throw new IllegalArgumentException("节点 " + node.getKey() + " 缺少审批人规则");
      }
      if (!ALLOWED_TYPES.contains(rule.getType())) {
        throw new IllegalArgumentException("节点 " + node.getKey() + " 的审批人规则类型无效: " + rule.getType());
      }
      switch (rule.getType()) {
        case "ROLE" -> {
          if (rule.getRoleCode() == null || rule.getRoleCode().isBlank()) {
            throw new IllegalArgumentException("节点 " + node.getKey() + " 的 ROLE 规则缺少 roleCode");
          }
        }
        case "REPORTING_LINE" -> {
          if (rule.getLevel() == null || rule.getLevel() < 1) {
            throw new IllegalArgumentException("节点 " + node.getKey() + " 的 REPORTING_LINE 规则缺少有效 level（≥1）");
          }
        }
        default -> {
          // ok
        }
      }
    }
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class WorkflowNodeModel {
    private String key;
    private String name;
    private WorkflowAssigneeRuleModel assigneeRule;

    public String getKey() {
      return key;
    }

    public void setKey(String key) {
      this.key = key;
    }

    public String getName() {
      return name;
    }

    public void setName(String name) {
      this.name = name;
    }

    public WorkflowAssigneeRuleModel getAssigneeRule() {
      return assigneeRule;
    }

    public void setAssigneeRule(WorkflowAssigneeRuleModel assigneeRule) {
      this.assigneeRule = assigneeRule;
    }
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class WorkflowAssigneeRuleModel {
    private String type;
    private String roleCode;
    private Integer level;

    public String getType() {
      return type;
    }

    public void setType(String type) {
      this.type = type;
    }

    public String getRoleCode() {
      return roleCode;
    }

    public void setRoleCode(String roleCode) {
      this.roleCode = roleCode;
    }

    public Integer getLevel() {
      return level;
    }

    public void setLevel(Integer level) {
      this.level = level;
    }
  }

  public static WorkflowDefinitionModel fromMap(Map<String, Object> map) {
    try {
      String json = MAPPER.writeValueAsString(map);
      return parse(json);
    } catch (JsonProcessingException e) {
      throw new IllegalArgumentException("流程定义 JSON 格式无效");
    }
  }
}
