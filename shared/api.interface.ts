// 前后端契约（契约优先）
// 说明：该文件仅包含类型与接口描述，不包含实现逻辑。

export type ApiResponse<T> = {
  code: string;
  message: string;
  data: T;
  traceId: string;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type HealthStatus = "ok";

export type HealthResponseData = {
  status: HealthStatus;
  service: string;
  version: string;
  serverTime: string; // ISO-8601
};

export type HealthApi = {
  /** GET /api/v1/health */
  getHealth: () => Promise<ApiResponse<HealthResponseData>>;
};

// -----------------------------
// Slice 1：认证与审计基础
// -----------------------------

export type UserStatus = "ACTIVE" | "DISABLED";

export type UserProfile = {
  id: string;
  username: string;
  status: UserStatus;
  employeeId?: string;
  lastLoginAt?: string; // ISO-8601
  /**
   * Slice 3（RBAC）：登录后返回的角色 code 集合
   * - 角色 code 形如：admin / hr / manager ...
   */
  roles?: string[];
  /**
   * Slice 3（RBAC）：登录后返回的权限点 code 集合
   * - 权限点 code 形如：employee:roster:view
   */
  permissions?: string[];
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponseData = {
  token: string;
  tokenType: "Bearer";
  expiresAt: string; // ISO-8601
  user: UserProfile;
};

export type AuthApi = {
  /** POST /api/v1/auth/login */
  login: (req: LoginRequest) => Promise<ApiResponse<LoginResponseData>>;
  /** GET /api/v1/auth/me */
  me: () => Promise<ApiResponse<UserProfile>>;
};

export type AuditAction = "VIEW" | "CREATE" | "UPDATE" | "DELETE" | "EXPORT";

export type AuditLog = {
  id: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  operatorUserId?: string;
  operatorUsername?: string;
  ipAddress?: string;
  traceId?: string;
  detailJson: Record<string, unknown>;
  createdAt: string; // ISO-8601
};

export type AuditLogQuery = {
  action?: AuditAction;
  resourceType?: string;
  operatorUsername?: string;
  from?: string; // ISO-8601
  to?: string; // ISO-8601
  page: number;
  pageSize: number;
};

export type AuditLogApi = {
  /** GET /api/v1/audit-logs?page=&pageSize=&... */
  listAuditLogs: (query: AuditLogQuery) => Promise<ApiResponse<PageResult<AuditLog>>>;
};

// -----------------------------
// Slice 2：字典与编码
// -----------------------------

export type DictStatus = "ACTIVE" | "DISABLED";

export type DictType = {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: DictStatus;
  sort: number;
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
};

export type DictItem = {
  id: string;
  typeCode: string;
  value: string;
  label: string;
  status: DictStatus;
  sort: number;
  extJson?: Record<string, unknown>;
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
};

export type DictTypeCreateRequest = {
  code: string;
  name: string;
  description?: string;
  status?: DictStatus;
  sort?: number;
};

export type DictTypeUpdateRequest = {
  name?: string;
  description?: string;
  status?: DictStatus;
  sort?: number;
};

export type DictItemCreateRequest = {
  typeCode: string;
  value: string;
  label: string;
  status?: DictStatus;
  sort?: number;
  extJson?: Record<string, unknown>;
};

export type DictItemUpdateRequest = {
  value?: string;
  label?: string;
  status?: DictStatus;
  sort?: number;
  extJson?: Record<string, unknown>;
};

export type DictTypeListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
};

export type DictApi = {
  /** GET /api/v1/dict-types?page=&pageSize=&keyword= */
  listDictTypes: (query: DictTypeListQuery) => Promise<ApiResponse<PageResult<DictType>>>;
  /** POST /api/v1/dict-types */
  createDictType: (req: DictTypeCreateRequest) => Promise<ApiResponse<DictType>>;
  /** PUT /api/v1/dict-types/{id} */
  updateDictType: (id: string, req: DictTypeUpdateRequest) => Promise<ApiResponse<DictType>>;
  /** DELETE /api/v1/dict-types/{id} */
  deleteDictType: (id: string) => Promise<ApiResponse<{ id: string }>>;
  /** GET /api/v1/dict-types/{id} */
  getDictType: (id: string) => Promise<ApiResponse<DictType>>;

  /** GET /api/v1/dict-types/{typeCode}/items */
  listDictItemsByTypeCode: (typeCode: string) => Promise<ApiResponse<DictItem[]>>;
  /** POST /api/v1/dict-items */
  createDictItem: (req: DictItemCreateRequest) => Promise<ApiResponse<DictItem>>;
  /** PUT /api/v1/dict-items/{id} */
  updateDictItem: (id: string, req: DictItemUpdateRequest) => Promise<ApiResponse<DictItem>>;
  /** DELETE /api/v1/dict-items/{id} */
  deleteDictItem: (id: string) => Promise<ApiResponse<{ id: string }>>;
};

export type CodeRuleSeqReset = "DAY" | "MONTH" | "YEAR" | "NEVER";

export type CodeRule = {
  id: string;
  code: string; // e.g. EMPLOYEE_NO / ORG_CODE
  name: string;
  pattern: string; // e.g. EMP-{yyyy}{MM}{dd}-{seq}
  seqReset: CodeRuleSeqReset;
  seqStart: number;
  seqLength: number;
  updatedAt?: string; // ISO-8601
};

export type CodeRuleCreateRequest = {
  code: string;
  name: string;
  pattern: string;
  seqReset: CodeRuleSeqReset;
  seqStart?: number;
  seqLength?: number;
};

export type CodeRuleUpdateRequest = {
  name?: string;
  pattern?: string;
  seqReset?: CodeRuleSeqReset;
  seqStart?: number;
  seqLength?: number;
};

export type CodeRuleListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
};

export type GenerateCodeRequest = {
  ruleCode: string;
};

export type GenerateCodeResponseData = {
  ruleCode: string;
  code: string;
};

export type CodeRuleApi = {
  /** GET /api/v1/code-rules?page=&pageSize=&keyword= */
  listCodeRules: (query: CodeRuleListQuery) => Promise<ApiResponse<PageResult<CodeRule>>>;
  /** POST /api/v1/code-rules */
  createCodeRule: (req: CodeRuleCreateRequest) => Promise<ApiResponse<CodeRule>>;
  /** PUT /api/v1/code-rules/{id} */
  updateCodeRule: (id: string, req: CodeRuleUpdateRequest) => Promise<ApiResponse<CodeRule>>;
  /** DELETE /api/v1/code-rules/{id} */
  deleteCodeRule: (id: string) => Promise<ApiResponse<{ id: string }>>;
  /** POST /api/v1/codes/generate */
  generateCode: (req: GenerateCodeRequest) => Promise<ApiResponse<GenerateCodeResponseData>>;
};

// -----------------------------
// Slice 3：权限 RBAC
// -----------------------------

export type RbacStatus = "ACTIVE" | "DISABLED";

export type DataScope = "SELF" | "DEPARTMENT" | "ALL";

export type Permission = {
  id: string;
  code: string; // e.g. employee:roster:view
  name: string;
  description?: string;
  status: RbacStatus;
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
};

export type Role = {
  id: string;
  code: string; // e.g. admin / hr
  name: string;
  description?: string;
  status: RbacStatus;
  dataScope: DataScope;
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
};

export type PermissionCreateRequest = {
  code: string;
  name: string;
  description?: string;
  status?: RbacStatus;
};

export type PermissionUpdateRequest = {
  name?: string;
  description?: string;
  status?: RbacStatus;
};

export type PermissionListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
};

export type RoleCreateRequest = {
  code: string;
  name: string;
  description?: string;
  status?: RbacStatus;
  dataScope?: DataScope;
};

export type RoleUpdateRequest = {
  name?: string;
  description?: string;
  status?: RbacStatus;
  dataScope?: DataScope;
};

export type RoleListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
};

export type SetRolePermissionsRequest = {
  permissionCodes: string[];
};

export type SetUserRolesRequest = {
  roleCodes: string[];
};

export type RbacApi = {
  /** GET /api/v1/permissions?page=&pageSize=&keyword= */
  listPermissions: (query: PermissionListQuery) => Promise<ApiResponse<PageResult<Permission>>>;
  /** POST /api/v1/permissions */
  createPermission: (req: PermissionCreateRequest) => Promise<ApiResponse<Permission>>;
  /** PUT /api/v1/permissions/{id} */
  updatePermission: (id: string, req: PermissionUpdateRequest) => Promise<ApiResponse<Permission>>;
  /** DELETE /api/v1/permissions/{id} */
  deletePermission: (id: string) => Promise<ApiResponse<{ id: string }>>;
  /** GET /api/v1/permissions/{id} */
  getPermission: (id: string) => Promise<ApiResponse<Permission>>;

  /** GET /api/v1/roles?page=&pageSize=&keyword= */
  listRoles: (query: RoleListQuery) => Promise<ApiResponse<PageResult<Role>>>;
  /** POST /api/v1/roles */
  createRole: (req: RoleCreateRequest) => Promise<ApiResponse<Role>>;
  /** PUT /api/v1/roles/{id} */
  updateRole: (id: string, req: RoleUpdateRequest) => Promise<ApiResponse<Role>>;
  /** DELETE /api/v1/roles/{id} */
  deleteRole: (id: string) => Promise<ApiResponse<{ id: string }>>;
  /** GET /api/v1/roles/{id} */
  getRole: (id: string) => Promise<ApiResponse<Role>>;

  /** GET /api/v1/roles/{id}/permissions */
  listRolePermissions: (id: string) => Promise<ApiResponse<string[]>>;
  /** PUT /api/v1/roles/{id}/permissions */
  setRolePermissions: (id: string, req: SetRolePermissionsRequest) => Promise<ApiResponse<{ id: string }>>;

  /** GET /api/v1/users/{id}/roles */
  listUserRoles: (id: string) => Promise<ApiResponse<string[]>>;
  /** PUT /api/v1/users/{id}/roles */
  setUserRoles: (id: string, req: SetUserRolesRequest) => Promise<ApiResponse<{ id: string }>>;
};

// -----------------------------
// Slice 4：流程引擎（最小可用）
// -----------------------------

export type WorkflowDefinitionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type WorkflowInstanceStatus = "RUNNING" | "COMPLETED" | "REJECTED" | "CANCELLED";

export type WorkflowTaskStatus = "PENDING" | "APPROVED" | "REJECTED";

export type WorkflowAssigneeRuleType = "DIRECT_MANAGER" | "ROLE" | "INITIATOR_SELECT";

export type WorkflowAssigneeRule =
  | { type: "DIRECT_MANAGER" }
  | { type: "ROLE"; roleCode: string }
  | { type: "INITIATOR_SELECT" };

export type WorkflowNodeDefinition = {
  key: string;
  name: string;
  assigneeRule: WorkflowAssigneeRule;
};

/** 顺序审批：nodes 数组即审批顺序 */
export type WorkflowDefinitionJson = {
  nodes: WorkflowNodeDefinition[];
};

export type WorkflowDefinition = {
  id: string;
  code: string;
  name: string;
  version: number;
  status: WorkflowDefinitionStatus;
  definitionJson: WorkflowDefinitionJson;
  description?: string;
  publishedAt?: string; // ISO-8601
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowInstance = {
  id: string;
  definitionId: string;
  definitionCode: string;
  definitionName: string;
  businessType: string;
  businessId: string;
  status: WorkflowInstanceStatus;
  initiatorUserId: string;
  initiatorUsername?: string;
  currentNodeIndex: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
};

export type WorkflowTask = {
  id: string;
  instanceId: string;
  nodeKey: string;
  nodeName: string;
  assigneeUserId: string;
  assigneeUsername?: string;
  status: WorkflowTaskStatus;
  comment?: string;
  businessType: string;
  businessId: string;
  definitionCode: string;
  definitionName: string;
  initiatorUsername?: string;
  createdAt?: string;
  completedAt?: string;
};

export type WorkflowDefinitionCreateRequest = {
  code: string;
  name: string;
  description?: string;
  definitionJson: WorkflowDefinitionJson;
};

export type WorkflowDefinitionUpdateRequest = {
  name?: string;
  description?: string;
  definitionJson?: WorkflowDefinitionJson;
};

export type WorkflowDefinitionListQuery = {
  keyword?: string;
  status?: WorkflowDefinitionStatus;
  page: number;
  pageSize: number;
};

export type StartWorkflowInstanceRequest = {
  /** 使用已发布流程定义的 code */
  definitionCode: string;
  businessType: string;
  businessId: string;
  /** HR 代发起时指定真实发起人（需 workflow:manage） */
  initiatorUserId?: string;
  /** INITIATOR_SELECT 节点：nodeKey -> assigneeUserId */
  nodeAssignees?: Record<string, string>;
};

export type WorkflowTaskActionRequest = {
  comment?: string;
};

export type WorkflowAssigneeOption = {
  id: string;
  username: string;
};

export type WorkflowApi = {
  /** GET /api/v1/workflow-definitions?page=&pageSize=&keyword=&status= */
  listWorkflowDefinitions: (
    query: WorkflowDefinitionListQuery,
  ) => Promise<ApiResponse<PageResult<WorkflowDefinition>>>;
  /** POST /api/v1/workflow-definitions */
  createWorkflowDefinition: (
    req: WorkflowDefinitionCreateRequest,
  ) => Promise<ApiResponse<WorkflowDefinition>>;
  /** PUT /api/v1/workflow-definitions/{id} */
  updateWorkflowDefinition: (
    id: string,
    req: WorkflowDefinitionUpdateRequest,
  ) => Promise<ApiResponse<WorkflowDefinition>>;
  /** GET /api/v1/workflow-definitions/{id} */
  getWorkflowDefinition: (id: string) => Promise<ApiResponse<WorkflowDefinition>>;
  /** POST /api/v1/workflow-definitions/{id}/publish */
  publishWorkflowDefinition: (id: string) => Promise<ApiResponse<WorkflowDefinition>>;
  /** DELETE /api/v1/workflow-definitions/{id} */
  deleteWorkflowDefinition: (id: string) => Promise<ApiResponse<{ id: string }>>;

  /** POST /api/v1/workflow-instances */
  startWorkflowInstance: (
    req: StartWorkflowInstanceRequest,
  ) => Promise<ApiResponse<WorkflowInstance>>;
  /** GET /api/v1/workflow-instances/{id} */
  getWorkflowInstance: (id: string) => Promise<ApiResponse<WorkflowInstance>>;
  /** GET /api/v1/workflow-instances/{id}/tasks */
  listWorkflowInstanceTasks: (id: string) => Promise<ApiResponse<WorkflowTask[]>>;

  /** GET /api/v1/tasks/todo?page=&pageSize= */
  listTodoTasks: (query: { page: number; pageSize: number }) => Promise<ApiResponse<PageResult<WorkflowTask>>>;
  /** GET /api/v1/tasks/done?page=&pageSize= */
  listDoneTasks: (query: { page: number; pageSize: number }) => Promise<ApiResponse<PageResult<WorkflowTask>>>;
  /** POST /api/v1/tasks/{id}/approve */
  approveTask: (id: string, req: WorkflowTaskActionRequest) => Promise<ApiResponse<WorkflowTask>>;
  /** POST /api/v1/tasks/{id}/reject */
  rejectTask: (id: string, req: WorkflowTaskActionRequest) => Promise<ApiResponse<WorkflowTask>>;

  /** GET /api/v1/workflow/assignee-options */
  listAssigneeOptions: () => Promise<ApiResponse<WorkflowAssigneeOption[]>>;
};

// -----------------------------
// Slice 5：组织岗位
// -----------------------------

export type OrgStatus = "ACTIVE" | "INACTIVE";

/** @deprecated 部门模型不再暴露组织类型，库表保留默认值 DEPARTMENT */
export type OrgType = "COMPANY" | "DIVISION" | "DEPARTMENT" | "TEAM";

/** 组织属性：实体 / 虚拟 */
export type OrgAttribute = "PHYSICAL" | "VIRTUAL";

/** 组织职能 */
export type OrgFunction = "RND" | "MANUFACTURING" | "MARKET" | "FUNCTION";

export type LegalEntity = {
  id: string;
  code: string;
  name: string;
  creditCode?: string;
  region?: string;
  status: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type LegalEntityCreateRequest = {
  code: string;
  name: string;
  creditCode?: string;
  region?: string;
  status?: OrgStatus;
};

export type LegalEntityUpdateRequest = {
  name?: string;
  creditCode?: string;
  region?: string;
  status?: OrgStatus;
};

export type LegalEntityListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
};

export type CostCenter = {
  id: string;
  code: string;
  name: string;
  legalEntityId: string;
  legalEntityName?: string;
  status: OrgStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type CostCenterCreateRequest = {
  code: string;
  name: string;
  legalEntityId: string;
  status?: OrgStatus;
};

export type CostCenterUpdateRequest = {
  name?: string;
  legalEntityId?: string;
  status?: OrgStatus;
};

export type CostCenterListQuery = {
  keyword?: string;
  legalEntityId?: string;
  page: number;
  pageSize: number;
};

export type DictOption = {
  value: string;
  label: string;
};

export type Organization = {
  id: string;
  /** 八位部门编号，如 20000001 */
  code: string;
  name: string;
  parentCode?: string;
  parentId?: string;
  parentName?: string;
  status: OrgStatus;
  statusLabel?: string;
  effectiveStartDate: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD, NULL=当前有效
  location?: string;
  locationLabel?: string;
  legalCompany?: string;
  legalCompanyLabel?: string;
  departmentType?: string;
  departmentTypeLabel?: string;
  departmentLevel?: string;
  departmentLevelLabel?: string;
  costCenter?: string;
  orgLeaderNo?: string;
  supervisingLeaderNo?: string;
  orgAttribute?: OrgAttribute;
  orgAttributeLabel?: string;
  orgFunction?: OrgFunction;
  orgFunctionLabel?: string;
  orgTags?: string;
  financialCode?: string;
  hrCoordinatorNo?: string;
  hrbpNo?: string;
  sscNo?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrganizationTreeNode = Organization & {
  children: OrganizationTreeNode[];
};

export type OrganizationCreateRequest = {
  name: string;
  parentCode?: string;
  effectiveStartDate: string;
  status?: OrgStatus;
  location?: string;
  legalCompany?: string;
  departmentType?: string;
  departmentLevel?: string;
  costCenter?: string;
  orgLeaderNo?: string;
  supervisingLeaderNo?: string;
  orgAttribute?: OrgAttribute;
  orgFunction?: OrgFunction;
  orgTags?: string;
  financialCode?: string;
  hrCoordinatorNo?: string;
  hrbpNo?: string;
  sscNo?: string;
};

export type OrganizationUpdateRequest = {
  /** CURRENT=修改当前版本；NEW_VERSION=按新生效日创建版本 */
  editMode?: OrganizationEditMode;
  name?: string;
  parentCode?: string;
  effectiveStartDate?: string;
  status?: OrgStatus;
  location?: string;
  legalCompany?: string;
  departmentType?: string;
  departmentLevel?: string;
  costCenter?: string;
  orgLeaderNo?: string;
  supervisingLeaderNo?: string;
  orgAttribute?: OrgAttribute;
  orgFunction?: OrgFunction;
  orgTags?: string;
  financialCode?: string;
  hrCoordinatorNo?: string;
  hrbpNo?: string;
  sscNo?: string;
};

export type OrganizationEditMode = "CURRENT" | "NEW_VERSION";

/** 同一部门编码下的生效版本摘要 */
export type OrganizationVersion = {
  id: string;
  code: string;
  name: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  status: OrgStatus;
  statusLabel?: string;
  /** 相对今天的时态 */
  temporal: "past" | "present" | "future";
  temporalLabel: string;
  /** 是否为当前开放版本（effectiveEndDate 为空） */
  isOpen: boolean;
};

export type OrganizationFormOptions = {
  locations: DictOption[];
  legalCompanies: DictOption[];
  departmentTypes: DictOption[];
  departmentLevels: DictOption[];
};

export type OrganizationTreeQuery = {
  asOfDate?: string; // YYYY-MM-DD
};

export type YesNo = "YES" | "NO";

export type PositionKind = "OFFICE" | "NON_OFFICE";

export type PositionSequence = "P" | "M" | "T";

export type Position = {
  id: string;
  code: string;
  name: string;
  effectiveStartDate: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
  organizationId: string;
  organizationName?: string;
  organizationCode?: string;
  status: OrgStatus;
  occupationalDisease: YesNo;
  positionCategory?: string;
  positionCategoryLabel?: string;
  positionKind?: PositionKind;
  positionSequence?: PositionSequence;
  positionLevel?: string;
  positionLevelLabel?: string;
  keyPosition: YesNo;
  identityCategory?: string;
  identityCategoryLabel?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PositionEditMode = OrganizationEditMode;

/** 同一岗位编码下的生效版本摘要 */
export type PositionVersion = {
  id: string;
  code: string;
  name: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  status: OrgStatus;
  statusLabel?: string;
  temporal: "past" | "present" | "future";
  temporalLabel: string;
  isOpen: boolean;
};

export type PositionFormOptions = {
  positionCategories: DictOption[];
  positionLevels: DictOption[];
  identityCategories: DictOption[];
};

export type PositionCreateRequest = {
  name: string;
  effectiveStartDate: string;
  organizationId: string;
  status?: OrgStatus;
  occupationalDisease?: YesNo;
  positionCategory?: string;
  positionKind?: PositionKind;
  positionSequence?: PositionSequence;
  positionLevel?: string;
  keyPosition?: YesNo;
  identityCategory?: string;
};

export type PositionUpdateRequest = {
  editMode?: PositionEditMode;
  name?: string;
  effectiveStartDate?: string;
  organizationId?: string;
  status?: OrgStatus;
  occupationalDisease?: YesNo;
  positionCategory?: string;
  positionKind?: PositionKind;
  positionSequence?: PositionSequence;
  positionLevel?: string;
  keyPosition?: YesNo;
  identityCategory?: string;
};

export type PositionListQuery = {
  keyword?: string;
  organizationId?: string;
  asOfDate?: string; // YYYY-MM-DD
  page: number;
  pageSize: number;
};

export type OrganizationApi = {
  /** GET /api/v1/legal-entities?page=&pageSize=&keyword= */
  listLegalEntities: (query: LegalEntityListQuery) => Promise<ApiResponse<PageResult<LegalEntity>>>;
  /** POST /api/v1/legal-entities */
  createLegalEntity: (req: LegalEntityCreateRequest) => Promise<ApiResponse<LegalEntity>>;
  /** PUT /api/v1/legal-entities/{id} */
  updateLegalEntity: (id: string, req: LegalEntityUpdateRequest) => Promise<ApiResponse<LegalEntity>>;
  /** DELETE /api/v1/legal-entities/{id} */
  deleteLegalEntity: (id: string) => Promise<ApiResponse<{ id: string }>>;

  /** GET /api/v1/cost-centers?page=&pageSize=&keyword=&legalEntityId= */
  listCostCenters: (query: CostCenterListQuery) => Promise<ApiResponse<PageResult<CostCenter>>>;
  /** POST /api/v1/cost-centers */
  createCostCenter: (req: CostCenterCreateRequest) => Promise<ApiResponse<CostCenter>>;
  /** PUT /api/v1/cost-centers/{id} */
  updateCostCenter: (id: string, req: CostCenterUpdateRequest) => Promise<ApiResponse<CostCenter>>;
  /** DELETE /api/v1/cost-centers/{id} */
  deleteCostCenter: (id: string) => Promise<ApiResponse<{ id: string }>>;

  /** GET /api/v1/organizations/tree?asOfDate= */
  getOrganizationTree: (query?: OrganizationTreeQuery) => Promise<ApiResponse<OrganizationTreeNode[]>>;
  /** GET /api/v1/organizations/department-type-options */
  listDepartmentTypeOptions: () => Promise<ApiResponse<DictOption[]>>;
  /** GET /api/v1/organizations/form-options */
  getOrganizationFormOptions: () => Promise<ApiResponse<OrganizationFormOptions>>;
  /** GET /api/v1/organizations/{id} */
  getOrganization: (id: string) => Promise<ApiResponse<Organization>>;
  /** GET /api/v1/organizations/by-code/{code}/versions */
  getOrganizationVersions: (code: string) => Promise<ApiResponse<OrganizationVersion[]>>;
  /** POST /api/v1/organizations */
  createOrganization: (req: OrganizationCreateRequest) => Promise<ApiResponse<Organization>>;
  /** PUT /api/v1/organizations/{id} */
  updateOrganization: (id: string, req: OrganizationUpdateRequest) => Promise<ApiResponse<Organization>>;

  /** GET /api/v1/positions/form-options */
  getPositionFormOptions: () => Promise<ApiResponse<PositionFormOptions>>;
  /** GET /api/v1/positions/{id} */
  getPosition: (id: string) => Promise<ApiResponse<Position>>;
  /** GET /api/v1/positions/by-code/{code}/versions */
  getPositionVersions: (code: string) => Promise<ApiResponse<PositionVersion[]>>;

  /** GET /api/v1/positions?page=&pageSize=&keyword=&organizationId=&asOfDate= */
  listPositions: (query: PositionListQuery) => Promise<ApiResponse<PageResult<Position>>>;
  /** POST /api/v1/positions */
  createPosition: (req: PositionCreateRequest) => Promise<ApiResponse<Position>>;
  /** PUT /api/v1/positions/{id} */
  updatePosition: (id: string, req: PositionUpdateRequest) => Promise<ApiResponse<Position>>;
  /** DELETE /api/v1/positions/{id} */
  deletePosition: (id: string) => Promise<ApiResponse<{ id: string }>>;
};

// -----------------------------
// Slice 6：编制
// -----------------------------

export type HeadcountPlan = {
  id: string;
  organizationId: string;
  organizationCode?: string;
  organizationName?: string;
  fiscalYear: number;
  plannedCount: number;
  occupiedCount: number;
  reservedCount: number;
  availableCount: number;
  usageRate: number;
  createdAt?: string;
  updatedAt?: string;
};

export type HeadcountPlanCreateRequest = {
  organizationId: string;
  fiscalYear: number;
  plannedCount: number;
};

export type HeadcountPlanUpdateRequest = {
  plannedCount?: number;
  occupiedCount?: number;
  reservedCount?: number;
};

export type HeadcountPlanListQuery = {
  keyword?: string;
  fiscalYear?: number;
  page: number;
  pageSize: number;
};

export type HeadcountCheckRequest = {
  organizationId: string;
  fiscalYear?: number;
  /** 本次拟占用编制数，默认 1 */
  delta?: number;
};

export type HeadcountCheckResult = {
  allowed: boolean;
  organizationId: string;
  fiscalYear: number;
  plannedCount: number;
  occupiedCount: number;
  reservedCount: number;
  availableCount: number;
  reason?: string;
};

export type HeadcountApi = {
  /** GET /api/v1/headcount-plans?page=&pageSize=&keyword=&fiscalYear= */
  listHeadcountPlans: (query: HeadcountPlanListQuery) => Promise<ApiResponse<PageResult<HeadcountPlan>>>;
  /** POST /api/v1/headcount-plans */
  createHeadcountPlan: (req: HeadcountPlanCreateRequest) => Promise<ApiResponse<HeadcountPlan>>;
  /** PUT /api/v1/headcount-plans/{id} */
  updateHeadcountPlan: (id: string, req: HeadcountPlanUpdateRequest) => Promise<ApiResponse<HeadcountPlan>>;
  /** DELETE /api/v1/headcount-plans/{id} */
  deleteHeadcountPlan: (id: string) => Promise<ApiResponse<{ id: string }>>;
  /** POST /api/v1/headcount/check */
  checkHeadcount: (req: HeadcountCheckRequest) => Promise<ApiResponse<HeadcountCheckResult>>;
};

