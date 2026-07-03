package com.hrplatform.platform.dict;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DictService {
  private final DictTypeMapper dictTypeMapper;
  private final DictItemMapper dictItemMapper;
  private final DictCache dictCache;

  public DictService(DictTypeMapper dictTypeMapper, DictItemMapper dictItemMapper, DictCache dictCache) {
    this.dictTypeMapper = dictTypeMapper;
    this.dictItemMapper = dictItemMapper;
    this.dictCache = dictCache;
  }

  public PageResult<DictTypeEntity> pageTypes(Query query) {
    LambdaQueryWrapper<DictTypeEntity> qw = new LambdaQueryWrapper<DictTypeEntity>()
        .orderByAsc(DictTypeEntity::getSort)
        .orderByAsc(DictTypeEntity::getId);

    String keyword = query.keyword() == null ? null : query.keyword().trim();
    if (keyword != null && !keyword.isBlank()) {
      qw.and(w -> w.like(DictTypeEntity::getCode, keyword).or().like(DictTypeEntity::getName, keyword));
    }

    long page = Math.max(1, query.page());
    long pageSize = Math.max(1, query.pageSize());
    long offset = (page - 1) * pageSize;

    Long total = dictTypeMapper.selectCount(qw);
    qw.last("LIMIT " + offset + ", " + pageSize);
    List<DictTypeEntity> records = dictTypeMapper.selectList(qw);
    return new PageResult<>(records, total == null ? 0 : total);
  }

  public DictTypeEntity requireType(long id) {
    DictTypeEntity e = dictTypeMapper.selectById(id);
    if (e == null) throw new IllegalArgumentException("字典类型不存在");
    return e;
  }

  @Transactional
  public DictTypeEntity createType(DictTypeEntity entity) {
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    dictTypeMapper.insert(entity);
    return requireType(entity.getId());
  }

  @Transactional
  public DictTypeEntity updateType(long id, DictTypeEntity patch) {
    DictTypeEntity cur = requireType(id);
    if (patch.getName() != null) cur.setName(patch.getName());
    if (patch.getDescription() != null) cur.setDescription(patch.getDescription());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    dictTypeMapper.updateById(cur);
    return requireType(id);
  }

  @Transactional
  public void deleteType(long id) {
    DictTypeEntity cur = requireType(id);
    if ("DISABLED".equals(cur.getStatus())) {
      throw new IllegalArgumentException("字典类型已停用");
    }
    cur.setStatus("DISABLED");
    dictTypeMapper.updateById(cur);
    List<DictItemEntity> items = dictItemMapper.selectList(
        new LambdaQueryWrapper<DictItemEntity>().eq(DictItemEntity::getTypeCode, cur.getCode())
    );
    for (DictItemEntity item : items) {
      if (!"DISABLED".equals(item.getStatus())) {
        item.setStatus("DISABLED");
        dictItemMapper.updateById(item);
      }
    }
    dictCache.invalidateType(cur.getCode());
  }

  public List<DictItemEntity> listItemsByTypeCode(String typeCode) {
    String tc = typeCode == null ? "" : typeCode.trim();
    if (tc.isBlank()) throw new IllegalArgumentException("typeCode 不能为空");
    List<DictItemEntity> cached = dictCache.getItems(tc);
    if (cached != null) return cached;

    List<DictItemEntity> items = dictItemMapper.selectList(
        new LambdaQueryWrapper<DictItemEntity>()
            .eq(DictItemEntity::getTypeCode, tc)
            .eq(DictItemEntity::getStatus, "ACTIVE")
            .orderByAsc(DictItemEntity::getSort)
            .orderByAsc(DictItemEntity::getId)
    );
    dictCache.putItems(tc, items);
    return items;
  }

  @Transactional
  public DictItemEntity createItem(DictItemEntity entity) {
    if (entity.getStatus() == null || entity.getStatus().isBlank()) entity.setStatus("ACTIVE");
    if (entity.getSort() == null) entity.setSort(0);
    dictItemMapper.insert(entity);
    DictItemEntity created = dictItemMapper.selectById(entity.getId());
    dictCache.invalidateType(entity.getTypeCode());
    return created;
  }

  @Transactional
  public DictItemEntity updateItem(long id, DictItemEntity patch) {
    DictItemEntity cur = dictItemMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("字典项不存在");
    String oldTypeCode = cur.getTypeCode();

    if (patch.getValue() != null) cur.setValue(patch.getValue());
    if (patch.getLabel() != null) cur.setLabel(patch.getLabel());
    if (patch.getStatus() != null) cur.setStatus(patch.getStatus());
    if (patch.getSort() != null) cur.setSort(patch.getSort());
    if (patch.getExtJson() != null) cur.setExtJson(patch.getExtJson());

    dictItemMapper.updateById(cur);

    dictCache.invalidateType(oldTypeCode);

    return dictItemMapper.selectById(id);
  }

  @Transactional
  public void deleteItem(long id) {
    DictItemEntity cur = dictItemMapper.selectById(id);
    if (cur == null) throw new IllegalArgumentException("字典项不存在");
    if ("DISABLED".equals(cur.getStatus())) {
      throw new IllegalArgumentException("字典项已停用");
    }
    cur.setStatus("DISABLED");
    dictItemMapper.updateById(cur);
    dictCache.invalidateType(cur.getTypeCode());
  }

  /** 管理端维护：返回全部字典项（含已停用） */
  public List<DictItemEntity> listAllItemsByTypeCode(String typeCode) {
    String tc = typeCode == null ? "" : typeCode.trim();
    if (tc.isBlank()) throw new IllegalArgumentException("typeCode 不能为空");
    return dictItemMapper.selectList(
        new LambdaQueryWrapper<DictItemEntity>()
            .eq(DictItemEntity::getTypeCode, tc)
            .orderByAsc(DictItemEntity::getSort)
            .orderByAsc(DictItemEntity::getId)
    );
  }

  public record Query(String keyword, long page, long pageSize) {}

  public record PageResult<T>(List<T> records, long total) {}
}

