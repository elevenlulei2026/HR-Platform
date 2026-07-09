package com.hrplatform.core.employee;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface EmployeeMapper extends BaseMapper<EmployeeEntity> {

  @Select("""
      <script>
      SELECT DISTINCT ea.employee_id
      FROM employee_assignment ea
      WHERE ea.is_primary = 1
        AND (ea.effective_end_date IS NULL OR ea.effective_end_date &gt;= CURDATE())
        AND ea.organization_id IN
        <foreach collection="orgIds" item="id" open="(" separator="," close=")">
          #{id}
        </foreach>
      </script>
      """)
  List<Long> selectEmployeeIdsByPrimaryOrganizations(@Param("orgIds") List<Long> orgIds);
}
