package com.hrplatform.platform.rbac;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PermissionMapper extends BaseMapper<PermissionEntity> {
  @Select("""
      SELECT DISTINCT p.code
      FROM user_role ur
      JOIN role r ON r.id = ur.role_id
      JOIN role_permission rp ON rp.role_id = r.id
      JOIN permission p ON p.id = rp.permission_id
      WHERE ur.user_id = #{userId}
        AND r.status = 'ACTIVE'
        AND p.status = 'ACTIVE'
      """)
  List<String> selectPermissionCodesByUserId(long userId);

  @Select("""
      SELECT p.code
      FROM role_permission rp
      JOIN permission p ON p.id = rp.permission_id
      JOIN role r ON r.id = rp.role_id
      WHERE rp.role_id = #{roleId}
        AND r.status = 'ACTIVE'
        AND p.status = 'ACTIVE'
      ORDER BY p.code
      """)
  List<String> selectPermissionCodesByRoleId(long roleId);
}

