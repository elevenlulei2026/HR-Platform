package com.hrplatform.platform.rbac;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserRoleMapper {
  @Select("""
      SELECT r.code
      FROM user_role ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = #{userId}
        AND r.status = 'ACTIVE'
      ORDER BY r.code
      """)
  List<String> selectRoleCodesByUserId(long userId);

  @Delete("DELETE FROM user_role WHERE user_id = #{userId}")
  int deleteByUserId(long userId);

  @Insert("INSERT INTO user_role (user_id, role_id) VALUES (#{userId}, #{roleId})")
  int insert(long userId, long roleId);

  @Select("""
      SELECT ur.user_id
      FROM user_role ur
      JOIN role r ON r.id = ur.role_id
      JOIN sys_user u ON u.id = ur.user_id
      WHERE r.code = #{roleCode}
        AND r.status = 'ACTIVE'
        AND u.status = 'ACTIVE'
      ORDER BY ur.user_id
      """)
  List<Long> selectActiveUserIdsByRoleCode(String roleCode);
}

