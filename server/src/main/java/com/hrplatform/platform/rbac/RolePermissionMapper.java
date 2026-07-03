package com.hrplatform.platform.rbac;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface RolePermissionMapper {
  @Delete("DELETE FROM role_permission WHERE role_id = #{roleId}")
  int deleteByRoleId(long roleId);

  @Insert("INSERT INTO role_permission (role_id, permission_id) VALUES (#{roleId}, #{permissionId})")
  int insert(long roleId, long permissionId);
}

