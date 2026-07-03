package com.hrplatform.platform.workflow;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface WorkflowDefinitionMapper extends BaseMapper<WorkflowDefinitionEntity> {
  @Select("""
      SELECT *
      FROM workflow_definition
      WHERE code = #{code}
        AND status = 'PUBLISHED'
      ORDER BY version DESC
      LIMIT 1
      """)
  WorkflowDefinitionEntity selectLatestPublishedByCode(String code);
}
