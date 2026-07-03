package com.hrplatform.platform.workflow;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface WorkflowTaskMapper extends BaseMapper<WorkflowTaskEntity> {
  @Select("""
      SELECT COUNT(1)
      FROM workflow_task t
      WHERE t.assignee_user_id = #{assigneeUserId}
        AND t.status = 'PENDING'
      """)
  Long countTodoByAssignee(long assigneeUserId);

  @Select("""
      SELECT t.*
      FROM workflow_task t
      JOIN workflow_instance i ON i.id = t.instance_id
      WHERE t.assignee_user_id = #{assigneeUserId}
        AND t.status = 'PENDING'
      ORDER BY t.created_at DESC
      LIMIT #{offset}, #{pageSize}
      """)
  List<WorkflowTaskEntity> selectTodoPage(
      @Param("assigneeUserId") long assigneeUserId,
      @Param("offset") long offset,
      @Param("pageSize") long pageSize
  );

  @Select("""
      SELECT t.*
      FROM workflow_task t
      JOIN workflow_instance i ON i.id = t.instance_id
      WHERE t.assignee_user_id = #{assigneeUserId}
        AND t.status IN ('APPROVED', 'REJECTED')
      ORDER BY t.completed_at DESC, t.id DESC
      LIMIT #{offset}, #{pageSize}
      """)
  List<WorkflowTaskEntity> selectDonePage(
      @Param("assigneeUserId") long assigneeUserId,
      @Param("offset") long offset,
      @Param("pageSize") long pageSize
  );

  @Select("""
      SELECT COUNT(1)
      FROM workflow_task t
      WHERE t.assignee_user_id = #{assigneeUserId}
        AND t.status IN ('APPROVED', 'REJECTED')
      """)
  Long countDoneByAssignee(long assigneeUserId);
}
