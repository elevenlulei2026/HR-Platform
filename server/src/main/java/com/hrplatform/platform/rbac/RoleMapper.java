package com.hrplatform.platform.rbac;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface RoleMapper extends BaseMapper<RoleEntity> {
  @Select("""
      SELECT r.code
      FROM user_role ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = #{userId}
        AND r.status = 'ACTIVE'
      """)
  List<String> selectRoleCodesByUserId(long userId);

  @Select("""
      SELECT r.data_scope
      FROM user_role ur
      JOIN role r ON r.id = ur.role_id
      WHERE ur.user_id = #{userId}
        AND r.status = 'ACTIVE'
      """)
  List<String> selectRoleDataScopesByUserId(long userId);
}

