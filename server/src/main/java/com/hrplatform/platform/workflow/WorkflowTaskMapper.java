package com.hrplatform.platform.workflow;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface WorkflowTaskMapper extends BaseMapper<WorkflowTaskEntity> {

  @Select("""
      <script>
      SELECT COUNT(1)
      FROM workflow_task t
      JOIN workflow_instance i ON i.id = t.instance_id
      LEFT JOIN sys_user u ON u.id = i.initiator_user_id
      LEFT JOIN employee e ON e.id = u.employee_id
      WHERE t.assignee_user_id = #{assigneeUserId}
        AND t.status = 'PENDING'
        <if test="businessType != null and businessType != ''">
          AND i.business_type = #{businessType}
        </if>
        <if test="keyword != null and keyword != ''">
          AND (
            t.node_name LIKE CONCAT('%', #{keyword}, '%')
            OR i.definition_name LIKE CONCAT('%', #{keyword}, '%')
            OR i.definition_code LIKE CONCAT('%', #{keyword}, '%')
            OR i.business_type LIKE CONCAT('%', #{keyword}, '%')
            OR i.business_id LIKE CONCAT('%', #{keyword}, '%')
            OR u.username LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(u.display_name, '') LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(e.full_name, '') LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(e.employee_no, '') LIKE CONCAT('%', #{keyword}, '%')
          )
        </if>
      </script>
      """)
  Long countTodoByAssignee(
      @Param("assigneeUserId") long assigneeUserId,
      @Param("keyword") String keyword,
      @Param("businessType") String businessType
  );

  @Select("""
      <script>
      SELECT t.*
      FROM workflow_task t
      JOIN workflow_instance i ON i.id = t.instance_id
      LEFT JOIN sys_user u ON u.id = i.initiator_user_id
      LEFT JOIN employee e ON e.id = u.employee_id
      WHERE t.assignee_user_id = #{assigneeUserId}
        AND t.status = 'PENDING'
        <if test="businessType != null and businessType != ''">
          AND i.business_type = #{businessType}
        </if>
        <if test="keyword != null and keyword != ''">
          AND (
            t.node_name LIKE CONCAT('%', #{keyword}, '%')
            OR i.definition_name LIKE CONCAT('%', #{keyword}, '%')
            OR i.definition_code LIKE CONCAT('%', #{keyword}, '%')
            OR i.business_type LIKE CONCAT('%', #{keyword}, '%')
            OR i.business_id LIKE CONCAT('%', #{keyword}, '%')
            OR u.username LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(u.display_name, '') LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(e.full_name, '') LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(e.employee_no, '') LIKE CONCAT('%', #{keyword}, '%')
          )
        </if>
      ORDER BY t.created_at DESC
      LIMIT #{offset}, #{pageSize}
      </script>
      """)
  List<WorkflowTaskEntity> selectTodoPage(
      @Param("assigneeUserId") long assigneeUserId,
      @Param("keyword") String keyword,
      @Param("businessType") String businessType,
      @Param("offset") long offset,
      @Param("pageSize") long pageSize
  );

  @Select("""
      <script>
      SELECT COUNT(1)
      FROM workflow_task t
      JOIN workflow_instance i ON i.id = t.instance_id
      LEFT JOIN sys_user u ON u.id = i.initiator_user_id
      LEFT JOIN employee e ON e.id = u.employee_id
      WHERE t.assignee_user_id = #{assigneeUserId}
        AND t.status IN ('APPROVED', 'REJECTED')
        <if test="businessType != null and businessType != ''">
          AND i.business_type = #{businessType}
        </if>
        <if test="keyword != null and keyword != ''">
          AND (
            t.node_name LIKE CONCAT('%', #{keyword}, '%')
            OR i.definition_name LIKE CONCAT('%', #{keyword}, '%')
            OR i.definition_code LIKE CONCAT('%', #{keyword}, '%')
            OR i.business_type LIKE CONCAT('%', #{keyword}, '%')
            OR i.business_id LIKE CONCAT('%', #{keyword}, '%')
            OR u.username LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(u.display_name, '') LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(e.full_name, '') LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(e.employee_no, '') LIKE CONCAT('%', #{keyword}, '%')
          )
        </if>
      </script>
      """)
  Long countDoneByAssignee(
      @Param("assigneeUserId") long assigneeUserId,
      @Param("keyword") String keyword,
      @Param("businessType") String businessType
  );

  @Select("""
      <script>
      SELECT t.*
      FROM workflow_task t
      JOIN workflow_instance i ON i.id = t.instance_id
      LEFT JOIN sys_user u ON u.id = i.initiator_user_id
      LEFT JOIN employee e ON e.id = u.employee_id
      WHERE t.assignee_user_id = #{assigneeUserId}
        AND t.status IN ('APPROVED', 'REJECTED')
        <if test="businessType != null and businessType != ''">
          AND i.business_type = #{businessType}
        </if>
        <if test="keyword != null and keyword != ''">
          AND (
            t.node_name LIKE CONCAT('%', #{keyword}, '%')
            OR i.definition_name LIKE CONCAT('%', #{keyword}, '%')
            OR i.definition_code LIKE CONCAT('%', #{keyword}, '%')
            OR i.business_type LIKE CONCAT('%', #{keyword}, '%')
            OR i.business_id LIKE CONCAT('%', #{keyword}, '%')
            OR u.username LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(u.display_name, '') LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(e.full_name, '') LIKE CONCAT('%', #{keyword}, '%')
            OR IFNULL(e.employee_no, '') LIKE CONCAT('%', #{keyword}, '%')
          )
        </if>
      ORDER BY t.completed_at DESC, t.id DESC
      LIMIT #{offset}, #{pageSize}
      </script>
      """)
  List<WorkflowTaskEntity> selectDonePage(
      @Param("assigneeUserId") long assigneeUserId,
      @Param("keyword") String keyword,
      @Param("businessType") String businessType,
      @Param("offset") long offset,
      @Param("pageSize") long pageSize
  );
}
