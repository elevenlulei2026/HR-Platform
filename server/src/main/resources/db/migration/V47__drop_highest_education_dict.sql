-- 最高学历与学历含义重复，统一使用 EDUCATION（学历）

DELETE FROM dict_item WHERE type_code = 'HIGHEST_EDUCATION';
DELETE FROM dict_type WHERE code = 'HIGHEST_EDUCATION';
