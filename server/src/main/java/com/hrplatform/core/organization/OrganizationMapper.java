package com.hrplatform.core.organization;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface OrganizationMapper extends BaseMapper<OrganizationEntity> {

  /** 组织子树（含根节点）：本部门及下级 */
  @Select("""
      WITH RECURSIVE org_tree AS (
        SELECT id
        FROM organization
        WHERE id = #{rootId}
          AND status = 'ACTIVE'
          AND (effective_end_date IS NULL OR effective_end_date >= CURDATE())
        UNION ALL
        SELECT o.id
        FROM organization o
        INNER JOIN org_tree t ON o.parent_id = t.id
        WHERE o.status = 'ACTIVE'
          AND (o.effective_end_date IS NULL OR o.effective_end_date >= CURDATE())
      )
      SELECT id FROM org_tree
      """)
  List<Long> selectOrgSubtreeIds(@Param("rootId") long rootId);
}
