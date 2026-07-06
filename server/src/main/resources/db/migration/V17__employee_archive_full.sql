-- Slice 7：员工档案全量补齐（§4.2 / §4.3 / §4.4）

-- =========================================================
-- 1) employee：补充 §4.2 缺失列（按要求使用独立 ALTER 语句）
-- =========================================================
ALTER TABLE employee ADD COLUMN marital_status VARCHAR(32) NULL COMMENT '婚姻状况';
ALTER TABLE employee ADD COLUMN political_affiliation VARCHAR(32) NULL COMMENT '政治面貌';
ALTER TABLE employee ADD COLUMN highest_education VARCHAR(32) NULL COMMENT '最高学历';
ALTER TABLE employee ADD COLUMN highest_education_grad_date DATE NULL COMMENT '最高学历毕业时间';
ALTER TABLE employee ADD COLUMN fertility_status VARCHAR(32) NULL COMMENT '生育状况';
ALTER TABLE employee ADD COLUMN ethnicity VARCHAR(32) NULL COMMENT '民族';
ALTER TABLE employee ADD COLUMN hobbies VARCHAR(512) NULL COMMENT '兴趣与爱好';
ALTER TABLE employee ADD COLUMN nationality VARCHAR(64) NULL COMMENT '国籍';
ALTER TABLE employee ADD COLUMN household_type VARCHAR(32) NULL COMMENT '户口类别';
ALTER TABLE employee ADD COLUMN household_location VARCHAR(256) NULL COMMENT '户口所在地';
ALTER TABLE employee ADD COLUMN party_org_transferred TINYINT(1) NULL COMMENT '党组织关系是否转入';
ALTER TABLE employee ADD COLUMN work_start_date DATE NULL COMMENT '开始工作时间';
ALTER TABLE employee ADD COLUMN wechat VARCHAR(64) NULL COMMENT '微信号码';
ALTER TABLE employee ADD COLUMN office_phone VARCHAR(32) NULL COMMENT '座机';
ALTER TABLE employee ADD COLUMN office_extension VARCHAR(16) NULL COMMENT '分机';
ALTER TABLE employee ADD COLUMN home_phone VARCHAR(32) NULL COMMENT '家庭电话';
ALTER TABLE employee ADD COLUMN id_card_address VARCHAR(256) NULL COMMENT '身份证地址';
ALTER TABLE employee ADD COLUMN residence_address VARCHAR(256) NULL COMMENT '居住地地址';
ALTER TABLE employee ADD COLUMN emergency_contact_name VARCHAR(64) NULL COMMENT '紧急联系人';
ALTER TABLE employee ADD COLUMN emergency_contact_phone VARCHAR(32) NULL COMMENT '紧急联系人电话';
ALTER TABLE employee ADD COLUMN emergency_contact_relation VARCHAR(32) NULL COMMENT '紧急联系人关系';
ALTER TABLE employee ADD COLUMN recruitment_channel VARCHAR(64) NULL COMMENT '招聘渠道';
ALTER TABLE employee ADD COLUMN recruitment_channel_detail VARCHAR(128) NULL COMMENT '招聘渠道细分';
ALTER TABLE employee ADD COLUMN group_seniority_start_date DATE NULL COMMENT '集团工龄开始日期';

-- =========================================================
-- 2) employee_assignment：补充 §4.4 列
-- =========================================================
ALTER TABLE employee_assignment ADD COLUMN job_id BIGINT NULL COMMENT '职务ID';
ALTER TABLE employee_assignment ADD COLUMN job_grade_code VARCHAR(32) NULL COMMENT '职级编码';
ALTER TABLE employee_assignment ADD COLUMN job_sequence VARCHAR(64) NULL COMMENT '职位序列';
ALTER TABLE employee_assignment ADD COLUMN employment_sub_type VARCHAR(64) NULL COMMENT '员工子类';
ALTER TABLE employee_assignment ADD COLUMN employee_nature VARCHAR(64) NULL COMMENT '员工性质';
ALTER TABLE employee_assignment ADD COLUMN contract_location VARCHAR(64) NULL COMMENT '合同地点';
ALTER TABLE employee_assignment ADD COLUMN work_location VARCHAR(64) NULL COMMENT '工作地点';
ALTER TABLE employee_assignment ADD COLUMN is_responsibility_system TINYINT(1) NULL COMMENT '是否责任制';
ALTER TABLE employee_assignment ADD COLUMN approval_authority VARCHAR(64) NULL COMMENT '审批权限';
ALTER TABLE employee_assignment ADD COLUMN is_management_cadre TINYINT(1) NULL COMMENT '是否管理干部';
ALTER TABLE employee_assignment ADD COLUMN is_core_talent TINYINT(1) NULL COMMENT '是否核心人才';
ALTER TABLE employee_assignment ADD COLUMN special_tags VARCHAR(255) NULL COMMENT '特殊标签';
ALTER TABLE employee_assignment ADD COLUMN group_attr_level VARCHAR(64) NULL COMMENT '集团属性分级';
ALTER TABLE employee_assignment ADD COLUMN payroll_company_id BIGINT NULL COMMENT '发薪公司（法人）';
ALTER TABLE employee_assignment ADD COLUMN cost_legal_entity_id BIGINT NULL COMMENT '成本归属法人';
ALTER TABLE employee_assignment ADD COLUMN salary_group VARCHAR(64) NULL COMMENT '薪资组';
ALTER TABLE employee_assignment ADD COLUMN business_unit VARCHAR(64) NULL COMMENT '业务单位';
ALTER TABLE employee_assignment ADD COLUMN legal_entity_id BIGINT NULL COMMENT '法人实体';
ALTER TABLE employee_assignment ADD COLUMN group_name VARCHAR(64) NULL COMMENT '集团';
ALTER TABLE employee_assignment ADD COLUMN business_group VARCHAR(64) NULL COMMENT '事业群';
ALTER TABLE employee_assignment ADD COLUMN system_name VARCHAR(64) NULL COMMENT '体系';
ALTER TABLE employee_assignment ADD COLUMN secondary_system VARCHAR(64) NULL COMMENT '二级体系';
ALTER TABLE employee_assignment ADD COLUMN center_name VARCHAR(64) NULL COMMENT '中心';
ALTER TABLE employee_assignment ADD COLUMN department_name VARCHAR(128) NULL COMMENT '部门';
ALTER TABLE employee_assignment ADD COLUMN module_name VARCHAR(64) NULL COMMENT '模块';
ALTER TABLE employee_assignment ADD COLUMN team_name VARCHAR(64) NULL COMMENT '组';
ALTER TABLE employee_assignment ADD COLUMN secondary_team VARCHAR(64) NULL COMMENT '二级组';
ALTER TABLE employee_assignment ADD COLUMN line_or_store VARCHAR(64) NULL COMMENT '线/店';
ALTER TABLE employee_assignment ADD COLUMN supplier VARCHAR(128) NULL COMMENT '供应商';
ALTER TABLE employee_assignment ADD COLUMN probation_period VARCHAR(32) NULL COMMENT '试用期期限';
ALTER TABLE employee_assignment ADD COLUMN expected_regularization_date DATE NULL COMMENT '预计转正日期';
ALTER TABLE employee_assignment ADD COLUMN regularization_opinion VARCHAR(512) NULL COMMENT '转正意见';
ALTER TABLE employee_assignment ADD COLUMN actual_regularization_date DATE NULL COMMENT '实际转正日期';
ALTER TABLE employee_assignment ADD COLUMN group_responsibility_start_date DATE NULL COMMENT '集团责任制开始日期';
ALTER TABLE employee_assignment ADD COLUMN hr_coordinator_no VARCHAR(64) NULL COMMENT '人资协调员工号';
ALTER TABLE employee_assignment ADD COLUMN hrbp_no VARCHAR(64) NULL COMMENT 'HRBP工号';
ALTER TABLE employee_assignment ADD COLUMN ssc_no VARCHAR(64) NULL COMMENT 'SSC工号';

ALTER TABLE employee_assignment ADD KEY idx_ea_job_id (job_id);
ALTER TABLE employee_assignment ADD KEY idx_ea_payroll_company_id (payroll_company_id);
ALTER TABLE employee_assignment ADD KEY idx_ea_legal_entity_id (legal_entity_id);
ALTER TABLE employee_assignment ADD KEY idx_ea_hrbp_no (hrbp_no);

-- job_id -> job(id)，仅当 job 表存在且外键不存在时添加
SET @job_table_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'job'
);
SET @fk_ea_job_exists = (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'employee_assignment'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name = 'fk_ea_job_id'
);
SET @sql_ea_job_fk = IF(
  @job_table_exists > 0 AND @fk_ea_job_exists = 0,
  'ALTER TABLE employee_assignment ADD CONSTRAINT fk_ea_job_id FOREIGN KEY (job_id) REFERENCES job(id)',
  'SELECT 1'
);
PREPARE stmt_ea_job_fk FROM @sql_ea_job_fk;
EXECUTE stmt_ea_job_fk;
DEALLOCATE PREPARE stmt_ea_job_fk;

-- payroll_company_id -> legal_entity(id)
SET @fk_ea_payroll_exists = (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'employee_assignment'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name = 'fk_ea_payroll_company_id'
);
SET @sql_ea_payroll_fk = IF(
  @fk_ea_payroll_exists = 0,
  'ALTER TABLE employee_assignment ADD CONSTRAINT fk_ea_payroll_company_id FOREIGN KEY (payroll_company_id) REFERENCES legal_entity(id)',
  'SELECT 1'
);
PREPARE stmt_ea_payroll_fk FROM @sql_ea_payroll_fk;
EXECUTE stmt_ea_payroll_fk;
DEALLOCATE PREPARE stmt_ea_payroll_fk;

-- legal_entity_id -> legal_entity(id)
SET @fk_ea_legal_entity_exists = (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'employee_assignment'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name = 'fk_ea_legal_entity_id'
);
SET @sql_ea_legal_entity_fk = IF(
  @fk_ea_legal_entity_exists = 0,
  'ALTER TABLE employee_assignment ADD CONSTRAINT fk_ea_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(id)',
  'SELECT 1'
);
PREPARE stmt_ea_legal_entity_fk FROM @sql_ea_legal_entity_fk;
EXECUTE stmt_ea_legal_entity_fk;
DEALLOCATE PREPARE stmt_ea_legal_entity_fk;

-- =========================================================
-- 3) §4.3 子表：补齐缺失档案子表（CREATE TABLE IF NOT EXISTS）
-- =========================================================

CREATE TABLE IF NOT EXISTS employee_family_member (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL,
  relation VARCHAR(32) NULL,
  is_internal_employee TINYINT(1) NOT NULL DEFAULT 0,
  phone VARCHAR(32) NULL,
  employer VARCHAR(128) NULL,
  position VARCHAR(128) NULL,
  birth_date DATE NULL,
  birth_certificate VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_efm_employee_id (employee_id),
  KEY idx_efm_relation (relation),
  CONSTRAINT fk_efm_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_internal_relative (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  relative_employee_id BIGINT NULL,
  relation VARCHAR(32) NULL,
  department_name VARCHAR(128) NULL,
  position_name VARCHAR(128) NULL,
  job_grade_name VARCHAR(64) NULL,
  hire_date DATE NULL,
  employment_status VARCHAR(32) NULL,
  last_work_day DATE NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eir_employee_id (employee_id),
  KEY idx_eir_relative_employee_id (relative_employee_id),
  CONSTRAINT fk_eir_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_cost_center_allocation (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  legal_entity_id BIGINT NULL,
  cost_center VARCHAR(64) NULL,
  percentage DECIMAL(5,2) NULL,
  effective_start_date DATE NULL,
  effective_end_date DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_ecca_employee_id (employee_id),
  KEY idx_ecca_legal_entity_id (legal_entity_id),
  KEY idx_ecca_effective (effective_start_date, effective_end_date),
  CONSTRAINT fk_ecca_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id),
  CONSTRAINT fk_ecca_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_contract (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  contract_code VARCHAR(64) NULL,
  contract_type VARCHAR(64) NULL,
  legal_entity_id BIGINT NULL,
  operation_type VARCHAR(64) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  effective_date DATE NULL,
  status VARCHAR(32) NULL,
  file_attachment_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_ec_employee_id (employee_id),
  KEY idx_ec_legal_entity_id (legal_entity_id),
  KEY idx_ec_status_end_date (status, end_date),
  CONSTRAINT fk_ec_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id),
  CONSTRAINT fk_ec_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_agreement (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  agreement_type VARCHAR(64) NULL,
  legal_entity_id BIGINT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status VARCHAR(32) NULL,
  file_attachment_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_ea2_employee_id (employee_id),
  KEY idx_ea2_legal_entity_id (legal_entity_id),
  KEY idx_ea2_status_end_date (status, end_date),
  CONSTRAINT fk_ea2_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id),
  CONSTRAINT fk_ea2_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_attendance_card (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  card_no VARCHAR(64) NULL,
  device_id VARCHAR(64) NULL,
  work_location VARCHAR(128) NULL,
  effective_start_date DATE NULL,
  effective_end_date DATE NULL,
  status VARCHAR(32) NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eac_employee_id (employee_id),
  KEY idx_eac_card_no (card_no),
  KEY idx_eac_effective (effective_start_date, effective_end_date),
  CONSTRAINT fk_eac_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_bank_account (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  account_type VARCHAR(32) NULL,
  country_code VARCHAR(16) NULL,
  bank_id BIGINT NULL,
  branch_id BIGINT NULL,
  account_no VARCHAR(512) NULL COMMENT 'AES 加密存储',
  account_name VARCHAR(128) NULL,
  currency_code VARCHAR(16) NULL,
  cnaps_code VARCHAR(64) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eba_employee_id (employee_id),
  KEY idx_eba_account_type (account_type),
  KEY idx_eba_is_primary (employee_id, is_primary),
  CONSTRAINT fk_eba_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_social_insurance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  social_security_no VARCHAR(512) NULL COMMENT 'AES 加密存储',
  social_base DECIMAL(12,2) NULL,
  housing_fund_no VARCHAR(128) NULL,
  housing_base DECIMAL(12,2) NULL,
  company VARCHAR(128) NULL,
  insurance_region VARCHAR(64) NULL,
  is_company_payroll TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_esi_employee_id (employee_id),
  KEY idx_esi_company (company),
  CONSTRAINT fk_esi_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_special_benefit (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  benefit_type VARCHAR(64) NULL,
  benefit_name VARCHAR(128) NULL,
  amount DECIMAL(12,2) NULL,
  currency_code VARCHAR(16) NULL,
  effective_start_date DATE NULL,
  effective_end_date DATE NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_esb_employee_id (employee_id),
  KEY idx_esb_type (benefit_type),
  KEY idx_esb_effective (effective_start_date, effective_end_date),
  CONSTRAINT fk_esb_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_commute_accommodation (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  record_type VARCHAR(32) NULL COMMENT 'SHUTTLE/ACCOMMODATION',
  route_or_address VARCHAR(255) NULL,
  effective_start_date DATE NULL,
  effective_end_date DATE NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eca_employee_id (employee_id),
  KEY idx_eca_record_type (record_type),
  KEY idx_eca_effective (effective_start_date, effective_end_date),
  CONSTRAINT fk_eca_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_attachment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  attachment_type VARCHAR(64) NULL,
  original_filename VARCHAR(255) NULL,
  storage_key VARCHAR(255) NULL,
  uploaded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eatt_employee_id (employee_id),
  KEY idx_eatt_type (attachment_type),
  KEY idx_eatt_uploaded_at (uploaded_at),
  CONSTRAINT fk_eatt_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_education (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  degree VARCHAR(64) NULL,
  education_level VARCHAR(32) NULL,
  is_highest TINYINT(1) NOT NULL DEFAULT 0,
  country_region VARCHAR(64) NULL,
  school_name VARCHAR(128) NULL,
  major VARCHAR(128) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  diploma_no VARCHAR(64) NULL,
  degree_no VARCHAR(64) NULL,
  attachment_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_ee_employee_id (employee_id),
  KEY idx_ee_is_highest (employee_id, is_highest),
  KEY idx_ee_period (start_date, end_date),
  CONSTRAINT fk_ee_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_work_experience (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  employer_name VARCHAR(128) NULL,
  department VARCHAR(128) NULL,
  position VARCHAR(128) NULL,
  leave_reason VARCHAR(255) NULL,
  last_salary DECIMAL(12,2) NULL,
  referee VARCHAR(64) NULL,
  referee_phone VARCHAR(32) NULL,
  pay_frequency VARCHAR(32) NULL,
  currency_code VARCHAR(16) NULL,
  description VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_ewe_employee_id (employee_id),
  KEY idx_ewe_period (start_date, end_date),
  KEY idx_ewe_employer_name (employer_name),
  CONSTRAINT fk_ewe_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_qualification (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  title_name VARCHAR(128) NULL,
  title_level VARCHAR(64) NULL,
  approval_date DATE NULL,
  expiry_date DATE NULL,
  certificate_no VARCHAR(64) NULL,
  issuing_org VARCHAR(128) NULL,
  attachment_id BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eq_employee_id (employee_id),
  KEY idx_eq_certificate_no (certificate_no),
  KEY idx_eq_expiry_date (expiry_date),
  CONSTRAINT fk_eq_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_reward (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  effective_date DATE NULL,
  archive_date DATE NULL,
  type VARCHAR(64) NULL,
  level VARCHAR(64) NULL,
  witness VARCHAR(64) NULL,
  amount DECIMAL(12,2) NULL,
  payment_method VARCHAR(64) NULL,
  issuing_org VARCHAR(128) NULL,
  document_no VARCHAR(64) NULL,
  description VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_er_employee_id (employee_id),
  KEY idx_er_effective_date (effective_date),
  KEY idx_er_type_level (type, level),
  CONSTRAINT fk_er_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_penalty (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  effective_date DATE NULL,
  archive_date DATE NULL,
  type VARCHAR(64) NULL,
  level VARCHAR(64) NULL,
  witness VARCHAR(64) NULL,
  amount DECIMAL(12,2) NULL,
  payment_method VARCHAR(64) NULL,
  issuing_org VARCHAR(128) NULL,
  document_no VARCHAR(64) NULL,
  description VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_ep_employee_id (employee_id),
  KEY idx_ep_effective_date (effective_date),
  KEY idx_ep_type_level (type, level),
  CONSTRAINT fk_ep_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_training_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  training_name VARCHAR(128) NULL,
  training_type VARCHAR(64) NULL,
  provider VARCHAR(128) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  hours DECIMAL(6,2) NULL,
  result VARCHAR(128) NULL,
  certificate_no VARCHAR(64) NULL,
  attachment_id BIGINT NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_etr_employee_id (employee_id),
  KEY idx_etr_period (start_date, end_date),
  KEY idx_etr_training_type (training_type),
  CONSTRAINT fk_etr_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_performance_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  period VARCHAR(32) NULL,
  rating VARCHAR(32) NULL,
  rating_label VARCHAR(64) NULL,
  score DECIMAL(5,2) NULL,
  reviewer_name VARCHAR(64) NULL,
  review_date DATE NULL,
  source_type VARCHAR(64) NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_epr_employee_id (employee_id),
  KEY idx_epr_period (period),
  KEY idx_epr_review_date (review_date),
  CONSTRAINT fk_epr_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_values_assessment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  period VARCHAR(32) NULL,
  dimension VARCHAR(64) NULL,
  score DECIMAL(5,2) NULL,
  level VARCHAR(32) NULL,
  assessor_name VARCHAR(64) NULL,
  assess_date DATE NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eva_employee_id (employee_id),
  KEY idx_eva_period (period),
  KEY idx_eva_assess_date (assess_date),
  CONSTRAINT fk_eva_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_talent_review (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  review_cycle VARCHAR(32) NULL,
  grid_position VARCHAR(32) NULL,
  potential_level VARCHAR(32) NULL,
  performance_level VARCHAR(32) NULL,
  reviewer_name VARCHAR(64) NULL,
  review_date DATE NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_etrv_employee_id (employee_id),
  KEY idx_etrv_review_cycle (review_cycle),
  KEY idx_etrv_review_date (review_date),
  CONSTRAINT fk_etrv_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_project (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  project_name VARCHAR(128) NULL,
  project_code VARCHAR(64) NULL,
  role VARCHAR(64) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  contribution VARCHAR(512) NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_epj_employee_id (employee_id),
  KEY idx_epj_project_code (project_code),
  KEY idx_epj_period (start_date, end_date),
  CONSTRAINT fk_epj_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_agent_assignment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  agent_id VARCHAR(64) NULL,
  agent_name VARCHAR(128) NULL,
  assignment_type VARCHAR(64) NULL,
  effective_start_date DATE NULL,
  effective_end_date DATE NULL,
  remark VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  KEY idx_eaa_employee_id (employee_id),
  KEY idx_eaa_agent_id (agent_id),
  KEY idx_eaa_effective (effective_start_date, effective_end_date),
  CONSTRAINT fk_eaa_employee_id FOREIGN KEY (employee_id) REFERENCES employee(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 4) HR 角色权限（同 V16 模式）
-- =========================================================
INSERT INTO permission (code, name, description, status)
SELECT 'employee:roster:view', '花名册查看', '查看员工花名册列表', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:roster:view');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:edit', '花名册维护', '新建/编辑员工主档', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:edit');

INSERT INTO permission (code, name, description, status)
SELECT 'employee:export', '花名册导出', '导出员工花名册并写审计', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'employee:export');

INSERT INTO permission (code, name, description, status)
SELECT 'reporting-line:view', '汇报关系查看', '查看汇报关系', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'reporting-line:view');

INSERT INTO permission (code, name, description, status)
SELECT 'reporting-line:edit', '汇报关系维护', '新建/编辑汇报关系', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE code = 'reporting-line:edit');

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
  'employee:roster:view',
  'employee:edit',
  'employee:export',
  'reporting-line:view',
  'reporting-line:edit'
)
WHERE r.code = 'hr'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
