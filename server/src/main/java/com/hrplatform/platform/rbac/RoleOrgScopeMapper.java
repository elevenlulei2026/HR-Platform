package com.hrplatform.platform.rbac;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface RoleOrgScopeMapper {

  @Select("""
      SELECT DISTINCT ros.organization_id
      FROM user_role ur
      JOIN role r ON r.id = ur.role_id AND r.status = 'ACTIVE'
      JOIN role_org_scope ros ON ros.role_id = r.id
      WHERE ur.user_id = #{userId}
      """)
  List<Long> selectOrganizationIdsByUserId(@Param("userId") long userId);

  @Select("SELECT organization_id FROM role_org_scope WHERE role_id = #{roleId}")
  List<Long> selectOrganizationIdsByRoleId(@Param("roleId") long roleId);

  @Delete("DELETE FROM role_org_scope WHERE role_id = #{roleId}")
  int deleteByRoleId(@Param("roleId") long roleId);

  @Insert("INSERT INTO role_org_scope (role_id, organization_id) VALUES (#{roleId}, #{organizationId})")
  int insert(@Param("roleId") long roleId, @Param("organizationId") long organizationId);
}
