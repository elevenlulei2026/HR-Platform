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
  /**
   * Slice 3（RBAC）：当前用户合并后的数据范围
   */
  dataScope?: DataScope;
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

// -----------------------------
// 职务异动类型目录（三级：操作 / 原因 / 子项）
// -----------------------------

export type MovementPhase = "HIRE" | "CHANGE" | "LEAVE";

export type MovementCatalogOptionReason = {
  code: string;
  name: string;
  requiresSub: boolean;
  subs: Array<{ code: string; name: string }>;
};

export type MovementCatalogOption = {
  movementType: string;
  movementTypeName: string;
  phase: MovementPhase;
  reasons: MovementCatalogOptionReason[];
};

// -----------------------------
// 员工组/员工子组目录（两级）
// -----------------------------

export type EmployeeGroupDef = {
  id: string;
  code: string;
  name: string;
  status: DictStatus;
  sort: number;
  remark?: string;
  subgroupCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeSubgroupDef = {
  id: string;
  employeeGroupCode: string;
  code: string;
  name: string;
  status: DictStatus;
  sort: number;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeGroupCatalogTreeRow = {
  employeeGroupCode: string;
  employeeGroupName: string;
  employeeGroupStatus: DictStatus;
  employeeSubgroupCode?: string;
  employeeSubgroupName?: string;
  employeeSubgroupStatus?: DictStatus;
};

export type EmployeeGroupCatalogOption = {
  employeeGroupCode: string;
  employeeGroupName: string;
  subgroups: Array<{ code: string; name: string }>;
};

export type EmployeeGroupCreateRequest = {
  code: string;
  name: string;
  status?: DictStatus;
  sort?: number;
  remark?: string;
};

export type EmployeeGroupUpdateRequest = {
  name?: string;
  status?: DictStatus;
  sort?: number;
  remark?: string;
};

export type EmployeeSubgroupCreateRequest = {
  employeeGroupCode: string;
  code: string;
  name: string;
  status?: DictStatus;
  sort?: number;
  remark?: string;
};

export type EmployeeSubgroupUpdateRequest = {
  name?: string;
  status?: DictStatus;
  sort?: number;
  remark?: string;
};

export type EmployeeGroupCatalogApi = {
  /** GET /api/v1/employee-groups */
  listEmployeeGroups: () => Promise<ApiResponse<EmployeeGroupDef[]>>;
  /** POST /api/v1/employee-groups */
  createEmployeeGroup: (req: EmployeeGroupCreateRequest) => Promise<ApiResponse<EmployeeGroupDef>>;
  /** PUT /api/v1/employee-groups/{id} */
  updateEmployeeGroup: (
    id: string,
    req: EmployeeGroupUpdateRequest,
  ) => Promise<ApiResponse<EmployeeGroupDef>>;
  /** PATCH /api/v1/employee-groups/{id}/status */
  updateEmployeeGroupStatus: (
    id: string,
    status: DictStatus,
  ) => Promise<ApiResponse<EmployeeGroupDef>>;
  /** GET /api/v1/employee-groups/{code}/subgroups */
  listEmployeeSubgroups: (employeeGroupCode: string) => Promise<ApiResponse<EmployeeSubgroupDef[]>>;
  /** POST /api/v1/employee-subgroups */
  createEmployeeSubgroup: (
    req: EmployeeSubgroupCreateRequest,
  ) => Promise<ApiResponse<EmployeeSubgroupDef>>;
  /** PUT /api/v1/employee-subgroups/{id} */
  updateEmployeeSubgroup: (
    id: string,
    req: EmployeeSubgroupUpdateRequest,
  ) => Promise<ApiResponse<EmployeeSubgroupDef>>;
  /** PATCH /api/v1/employee-subgroups/{id}/status */
  updateEmployeeSubgroupStatus: (
    id: string,
    status: DictStatus,
  ) => Promise<ApiResponse<EmployeeSubgroupDef>>;
  /** GET /api/v1/employee-group-catalog/options */
  getEmployeeGroupCatalogOptions: () => Promise<ApiResponse<EmployeeGroupCatalogOption[]>>;
  /** GET /api/v1/employee-group-catalog/tree */
  getEmployeeGroupCatalogTree: () => Promise<ApiResponse<EmployeeGroupCatalogTreeRow[]>>;
};

// -----------------------------
// 父子值配置（通用两级目录）
// -----------------------------

export type ParentChildTypeDef = {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: DictStatus;
  sort: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ParentChildItemDef = {
  id: string;
  typeCode: string;
  parentCode?: string | null;
  code: string;
  name: string;
  status: DictStatus;
  sort: number;
  remark?: string;
  extJson?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type ParentChildTreeRow = {
  typeCode: string;
  parentCode: string;
  parentName: string;
  parentStatus: DictStatus;
  childCode?: string;
  childName?: string;
  childStatus?: DictStatus;
};

export type ParentChildOption = {
  parentCode: string;
  parentName: string;
  children: Array<{ code: string; name: string }>;
};

export type ParentChildTreeRow3 = {
  typeCode: string;
  level1Code: string;
  level1Name: string;
  level1Status: DictStatus;
  level2Code?: string;
  level2Name?: string;
  level2Status?: DictStatus;
  level3Code?: string;
  level3Name?: string;
  level3Status?: DictStatus;
};

export type ParentChildOption3 = {
  parentCode: string;
  parentName: string;
  meta?: Record<string, unknown>;
  children: Array<{
    code: string;
    name: string;
    children: Array<{ code: string; name: string }>;
  }>;
};

export type ParentChildTypeCreateRequest = {
  code: string;
  name: string;
  description?: string;
  status?: DictStatus;
  sort?: number;
};

export type ParentChildTypeUpdateRequest = {
  name?: string;
  description?: string;
  status?: DictStatus;
  sort?: number;
};

export type ParentCreateRequest = {
  typeCode: string;
  code: string;
  name: string;
  status?: DictStatus;
  sort?: number;
  remark?: string;
};

export type ChildCreateRequest = {
  typeCode: string;
  parentCode: string;
  code: string;
  name: string;
  status?: DictStatus;
  sort?: number;
  remark?: string;
};

export type ParentChildItemUpdateRequest = {
  name?: string;
  status?: DictStatus;
  sort?: number;
  remark?: string;
};

export type ParentChildCatalogApi = {
  /** GET /api/v1/parent-child-types */
  listParentChildTypes: () => Promise<ApiResponse<ParentChildTypeDef[]>>;
  /** POST /api/v1/parent-child-types */
  createParentChildType: (
    req: ParentChildTypeCreateRequest,
  ) => Promise<ApiResponse<ParentChildTypeDef>>;
  /** PUT /api/v1/parent-child-types/{id} */
  updateParentChildType: (
    id: string,
    req: ParentChildTypeUpdateRequest,
  ) => Promise<ApiResponse<ParentChildTypeDef>>;
  /** GET /api/v1/parent-child-types/{typeCode}/parents */
  listParentsByType: (typeCode: string) => Promise<ApiResponse<ParentChildItemDef[]>>;
  /** GET /api/v1/parent-child-types/{typeCode}/parents/{parentCode}/children */
  listChildrenByParent: (
    typeCode: string,
    parentCode: string,
  ) => Promise<ApiResponse<ParentChildItemDef[]>>;
  /** POST /api/v1/parent-child-parents */
  createParent: (req: ParentCreateRequest) => Promise<ApiResponse<ParentChildItemDef>>;
  /** PUT /api/v1/parent-child-parents/{id} */
  updateParent: (
    id: string,
    req: ParentChildItemUpdateRequest,
  ) => Promise<ApiResponse<ParentChildItemDef>>;
  /** POST /api/v1/parent-child-children */
  createChild: (req: ChildCreateRequest) => Promise<ApiResponse<ParentChildItemDef>>;
  /** PUT /api/v1/parent-child-children/{id} */
  updateChild: (
    id: string,
    req: ParentChildItemUpdateRequest,
  ) => Promise<ApiResponse<ParentChildItemDef>>;
  /** PATCH /api/v1/parent-child-items/{id}/status */
  updateParentChildItemStatus: (
    id: string,
    status: DictStatus,
  ) => Promise<ApiResponse<ParentChildItemDef>>;
  /** GET /api/v1/parent-child-types/{typeCode}/tree */
  getParentChildTree: (typeCode: string) => Promise<ApiResponse<ParentChildTreeRow[]>>;
  /** GET /api/v1/parent-child-types/{typeCode}/tree3 */
  getParentChildTree3: (typeCode: string) => Promise<ApiResponse<ParentChildTreeRow3[]>>;
  /** GET /api/v1/parent-child-types/{typeCode}/options */
  getParentChildOptions: (typeCode: string) => Promise<ApiResponse<ParentChildOption[]>>;
  /** GET /api/v1/parent-child-types/{typeCode}/options3 */
  getParentChildOptions3: (typeCode: string) => Promise<ApiResponse<ParentChildOption3[]>>;
};

export type CodeRuleSeqReset = "DAY" | "MONTH" | "YEAR" | "NEVER";

export type CodeRule = {
  id: string;
  code: string; // e.g. EMPLOYEE_NO / ORG_CODE
  name: string;
  pattern: string; // e.g. {yy}{MM}{seq}（工号）或 EMP-{yyyy}{MM}{dd}-{seq}
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

export type DataScope = "SELF" | "DEPARTMENT" | "CUSTOM" | "ALL";

/** 权限动作约定：{domain}:{resource}:{action} */
export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "import"
  | "export";

/** 员工档案分区（与 employee:archive:{section}:{action} 对应） */
export type ArchivePermissionSection =
  | "personal"
  | "work"
  | "service"
  | "background"
  | "development";

export type Permission = {
  id: string;
  code: string; // e.g. employee:roster:view
  name: string;
  description?: string;
  status: RbacStatus;
  menuId?: string;
  moduleCode?: string;
  resourceCode?: string;
  actionCode?: string;
  sortOrder?: number;
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
};

export type SysMenuType = "MEGA" | "GROUP" | "ITEM";

export type SysMenu = {
  id: string;
  parentId?: string;
  code: string;
  title: string;
  path?: string;
  icon?: string;
  menuType: SysMenuType;
  permissionCode?: string;
  sortOrder: number;
  status: RbacStatus;
  description?: string;
  children?: SysMenu[];
};

export type Role = {
  id: string;
  code: string; // e.g. admin / hr
  name: string;
  description?: string;
  status: RbacStatus;
  dataScope: DataScope;
  /** 当 dataScope=CUSTOM 时返回 */
  orgScopeIds?: string[];
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
};

export type PermissionCreateRequest = {
  code: string;
  name: string;
  description?: string;
  status?: RbacStatus;
  menuId?: string;
  moduleCode?: string;
  resourceCode?: string;
  actionCode?: string;
  sortOrder?: number;
};

export type PermissionUpdateRequest = {
  name?: string;
  description?: string;
  status?: RbacStatus;
  menuId?: string;
  moduleCode?: string;
  resourceCode?: string;
  actionCode?: string;
  sortOrder?: number;
};

export type PermissionListQuery = {
  keyword?: string;
  status?: RbacStatus | "ALL";
  menuId?: string;
  moduleCode?: string;
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

export type SetRoleOrgScopesRequest = {
  organizationIds: string[];
};

export type SysMenuCreateRequest = {
  parentId?: string;
  code: string;
  title: string;
  path?: string;
  icon?: string;
  menuType?: SysMenuType;
  permissionCode?: string;
  sortOrder?: number;
  status?: RbacStatus;
  description?: string;
};

export type SysMenuUpdateRequest = {
  parentId?: string;
  title?: string;
  path?: string;
  icon?: string;
  menuType?: SysMenuType;
  permissionCode?: string;
  sortOrder?: number;
  status?: RbacStatus;
  description?: string;
};

export type MenuApi = {
  /** GET /api/v1/menus/nav-tree */
  getNavTree: () => Promise<ApiResponse<SysMenu[]>>;
  /** GET /api/v1/menus/tree */
  getAdminMenuTree: () => Promise<ApiResponse<SysMenu[]>>;
  /** POST /api/v1/menus */
  createMenu: (req: SysMenuCreateRequest) => Promise<ApiResponse<SysMenu>>;
  /** PUT /api/v1/menus/{id} */
  updateMenu: (id: string, req: SysMenuUpdateRequest) => Promise<ApiResponse<SysMenu>>;
  /** DELETE /api/v1/menus/{id} */
  deleteMenu: (id: string) => Promise<ApiResponse<{ id: string }>>;
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
  /** GET /api/v1/roles/{id}/org-scopes */
  listRoleOrgScopes: (id: string) => Promise<ApiResponse<string[]>>;
  /** PUT /api/v1/roles/{id}/org-scopes */
  setRoleOrgScopes: (id: string, req: SetRoleOrgScopesRequest) => Promise<ApiResponse<{ id: string }>>;

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

// -----------------------------
// Slice 7：员工主数据
// -----------------------------

export type EmployeeStatus = "CANDIDATE" | "PROBATION" | "ACTIVE" | "TERMINATED";

export type EmployeeMasterEditMode = "CURRENT" | "NEW_VERSION";

/** 任职记录编辑模式（对齐个人主档） */
export type EmployeeAssignmentEditMode = "CURRENT" | "NEW_VERSION";

/** 考勤卡编辑模式（对齐任职/个人主档） */
export type EmployeeAttendanceCardEditMode = "CURRENT" | "NEW_VERSION";

/** 行政信息 / 住宿信息编辑模式（对齐考勤卡） */
export type EmployeeAdminInfoEditMode = "CURRENT" | "NEW_VERSION";
export type EmployeeAccommodationEditMode = "CURRENT" | "NEW_VERSION";

/** 同一员工下的个人主档生效版本摘要 */
export type EmployeeMasterVersion = {
  id: string;
  employeeId: string;
  effectiveStartDate: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
  status: EmployeeStatus;
  statusLabel?: string;
  temporal: "past" | "present" | "future";
  temporalLabel: string;
  isOpen: boolean;
};

/** 职务指示：主要职务 / 次要职务 */
export type AssignmentIndicator = "PRIMARY" | "SECONDARY";

export type ReportingLineType = "DIRECT" | "DOTTED";

/** 职务数据异动操作码 */
export type MovementType =
  | "HIR"
  | "REH"
  | "PRC"
  | "SPR"
  | "PRO"
  | "DEM"
  | "DTA"
  | "XFR"
  | "PAY"
  | "TER";

export type Employee = {
  id: string;
  employeeNo: string;
  /**
   * 个人主档生效开始日期（用于历史快照/未来预览）
   * - 仅在详情快照接口返回；列表可能不返回
   */
  effectiveStartDate?: string; // YYYY-MM-DD
  /**
   * 个人主档生效结束日期（NULL/不返回表示至今有效）
   */
  effectiveEndDate?: string; // YYYY-MM-DD
  fullName: string;
  adAccount?: string;
  gender?: string;
  genderLabel?: string;
  mobile: string;
  /** 手机号是否已脱敏展示 */
  mobileMasked: boolean;
  companyEmail?: string;
  personalEmail?: string;
  maritalStatus?: string;
  maritalStatusLabel?: string;
  politicalAffiliation?: string;
  politicalAffiliationLabel?: string;
  /** 学历（数据字典：EDUCATION） */
  highestEducation?: string;
  highestEducationLabel?: string;
  /** 学历毕业日期 */
  highestEducationGradDate?: string; // YYYY-MM-DD
  fertilityStatus?: string;
  fertilityStatusLabel?: string;
  ethnicity?: string;
  ethnicityLabel?: string;
  hobbies?: string;
  nationality?: string;
  nationalityLabel?: string;
  householdType?: string;
  householdTypeLabel?: string;
  householdLocation?: string;
  partyOrgTransferred?: boolean;
  workStartDate?: string; // YYYY-MM-DD
  wechat?: string;
  officePhone?: string;
  officeExtension?: string;
  homePhone?: string;
  idCardAddress?: string;
  residenceAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  emergencyContactRelationLabel?: string;
  recruitmentChannel?: string;
  recruitmentChannelLabel?: string;
  recruitmentChannelDetail?: string;
  groupSeniorityStartDate?: string; // YYYY-MM-DD
  hireDate: string; // YYYY-MM-DD
  status: EmployeeStatus;
  statusLabel?: string;
  /** 主任职摘要（列表/详情 Hero） */
  primaryOrganizationId?: string;
  primaryOrganizationName?: string;
  primaryPositionId?: string;
  primaryPositionName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeFormOptions = {
  maritalStatuses: DictOption[];
  politicalAffiliations: DictOption[];
  /** 学历（数据字典：EDUCATION） */
  educations: DictOption[];
  /** 学位（数据字典：DEGREE） */
  degrees: DictOption[];
  fertilityStatuses: DictOption[];
  ethnicities: DictOption[];
  nationalities: DictOption[];
  householdTypes: DictOption[];
  employeeRelations: DictOption[];
  recruitmentChannels: DictOption[];
  countryRegions: DictOption[];
  idTypes: DictOption[];
  bankAccountTypes: DictOption[];
  bankIds: DictOption[];
  branchIds: DictOption[];
  currencies: DictOption[];
  /** 发薪公司（数据字典：PAYROLL_COMPANY） */
  payrollCompanies: DictOption[];
  /** 参保地区（数据字典：INSURANCE_REGION） */
  insuranceRegions: DictOption[];
  /** 工作环境（数据字典：WORK_ENVIRONMENT） */
  workEnvironments: DictOption[];
};

/** 任职记录表单字典选项（GET /api/v1/employees/assignment-form-options） */
export type EmployeeAssignmentFormOptions = {
  suppliers: DictOption[];
  probationPeriods: DictOption[];
  contractLocations: DictOption[];
  workLocations: DictOption[];
  approvalAuthorities: DictOption[];
  jobGrades: DictOption[];
  employeeNatures: DictOption[];
  groupAttrLevels: DictOption[];
  salaryGroups: DictOption[];
  legalCompanies: DictOption[];
  payrollCompanies: DictOption[];
};

export type EmployeeIdDocument = {
  id: string;
  employeeId: string;
  countryRegion?: string;
  countryRegionLabel?: string;
  idType?: string;
  idTypeLabel?: string;
  idNumber: string;
  idNumberMasked: boolean;
  validFrom?: string;
  validTo?: string;
  isPrimary: boolean;
};

export type EmployeeAssignment = {
  id: string;
  employeeId: string;
  /** 生效日期 */
  effectiveStartDate: string;
  effectiveEndDate?: string;
  /** 创建日期（系统） */
  createdAt?: string;
  /** 入职日期 */
  hireDate?: string;
  /** 司龄（根据集团工龄开始日期计算，只读） */
  companyTenure?: string;
  isRehire?: boolean;
  groupResponsibilityStartDate?: string;
  groupSeniorityStartDate?: string;
  supplier?: string;
  supplierLabel?: string;
  probationPeriod?: string;
  probationPeriodLabel?: string;
  /** 预计转正日期（入职日期 + 试用期，只读） */
  expectedRegularizationDate?: string;
  actualRegularizationDate?: string;
  /** 职务异动：操作 / 原因 / 原因子项 */
  movementType?: MovementType;
  movementTypeName?: string;
  reasonCode?: string;
  reasonDescription?: string;
  reasonSubCode?: string;
  reasonSubDescription?: string;
  /** 职务指示 */
  assignmentIndicator: AssignmentIndicator;
  assignmentIndicatorLabel?: string;
  /** @deprecated 与 assignmentIndicator 同步，兼容旧数据 */
  isPrimary: boolean;
  legalEntityCode?: string;
  legalEntityLabel?: string;
  organizationId: string;
  organizationName?: string;
  organizationCode?: string;
  positionId: string;
  positionName?: string;
  positionCode?: string;
  /** 岗位序列（选择岗位后带出，只读） */
  jobSequence?: string;
  jobSequenceLabel?: string;
  jobGradeCode?: string;
  jobGradeLabel?: string;
  contractLocation?: string;
  contractLocationLabel?: string;
  workLocation?: string;
  workLocationLabel?: string;
  isResponsibilitySystem?: boolean;
  approvalAuthority?: string;
  approvalAuthorityLabel?: string;
  employeeGroupCode?: string;
  employeeGroupName?: string;
  employeeSubgroupCode?: string;
  employeeSubgroupName?: string;
  /** 该岗位开始日期（只读） */
  positionStartDate?: string;
  /** 在岗时间（只读） */
  tenureOnPosition?: string;
  employeeNature?: string;
  employeeNatureLabel?: string;
  groupAttrLevel?: string;
  groupAttrLevelLabel?: string;
  payrollCompanyCode?: string;
  payrollCompanyLabel?: string;
  costLegalEntityCode?: string;
  costLegalEntityLabel?: string;
  trueResignationReasonHrbp?: string;
  trueResignationReasonSubHrbp?: string;
  handoverEmployeeId?: string;
  handoverEmployeeName?: string;
  handoverEmployeeNo?: string;
  resignationDestination?: string;
  nonCompeteCompanySuggest?: boolean;
  nonCompeteWithPay?: boolean;
  salaryGroup?: string;
  salaryGroupLabel?: string;
  /** 在 asOfDate 快照下是否有效 */
  activeAsOf?: boolean;
  updatedAt?: string;
};

export type ReportingLine = {
  id: string;
  employeeId: string;
  employeeNo?: string;
  employeeName?: string;
  managerEmployeeId: string;
  managerEmployeeNo?: string;
  managerEmployeeName?: string;
  lineType: ReportingLineType;
  lineTypeLabel?: string;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeMovement = {
  id: string;
  employeeId: string;
  movementType: MovementType;
  movementTypeName: string;
  reasonCode?: string;
  reasonDescription?: string;
  reasonSubCode?: string;
  reasonSubDescription?: string;
  effectiveDate: string;
  fromAssignmentId?: string;
  toAssignmentId?: string;
  sourceRequestType?: string;
  sourceRequestId?: string;
  remark?: string;
  createdAt?: string;
  createdBy?: string;
};

export type EmployeeListQuery = {
  keyword?: string;
  status?: EmployeeStatus;
  organizationId?: string;
  /** 显式申请查看敏感字段明文（须 employee:sensitive:view） */
  revealSensitive?: boolean;
  page: number;
  pageSize: number;
};

export type EmployeeCreateRequest = {
  fullName: string;
  gender: string;
  mobile: string;
  companyEmail?: string;
  personalEmail?: string;
  adAccount?: string;
  maritalStatus?: string;
  politicalAffiliation?: string;
  highestEducation?: string;
  highestEducationGradDate?: string; // YYYY-MM-DD
  fertilityStatus?: string;
  ethnicity?: string;
  hobbies?: string;
  nationality?: string;
  householdType?: string;
  householdLocation?: string;
  partyOrgTransferred?: boolean;
  workStartDate?: string; // YYYY-MM-DD
  wechat?: string;
  officePhone?: string;
  officeExtension?: string;
  homePhone?: string;
  idCardAddress?: string;
  residenceAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  recruitmentChannel?: string;
  recruitmentChannelDetail?: string;
  groupSeniorityStartDate?: string; // YYYY-MM-DD
  hireDate: string;
  status?: EmployeeStatus;
  /** 可选：同时创建主任职 */
  organizationId?: string;
  positionId?: string;
  employmentType?: string;
  assignmentEffectiveStartDate?: string;
};

export type EmployeeUpdateRequest = {
  /**
   * 生效日期编辑模式：
   * - CURRENT：修改当前版本，不改变生效日期
   * - NEW_VERSION：按新生效日创建一条个人主档版本
   */
  editMode?: EmployeeMasterEditMode;
  /**
   * NEW_VERSION 时必填，指定新版本的生效开始日（YYYY-MM-DD）
   */
  effectiveStartDate?: string;
  fullName?: string;
  gender?: string;
  mobile?: string;
  companyEmail?: string;
  personalEmail?: string;
  adAccount?: string;
  maritalStatus?: string;
  politicalAffiliation?: string;
  highestEducation?: string;
  highestEducationGradDate?: string; // YYYY-MM-DD
  fertilityStatus?: string;
  ethnicity?: string;
  hobbies?: string;
  nationality?: string;
  householdType?: string;
  householdLocation?: string;
  partyOrgTransferred?: boolean;
  workStartDate?: string; // YYYY-MM-DD
  wechat?: string;
  officePhone?: string;
  officeExtension?: string;
  homePhone?: string;
  idCardAddress?: string;
  residenceAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  recruitmentChannel?: string;
  recruitmentChannelDetail?: string;
  groupSeniorityStartDate?: string; // YYYY-MM-DD
  hireDate?: string;
  status?: EmployeeStatus;
};

export type EmployeeAssignmentCreateRequest = {
  effectiveStartDate: string;
  effectiveEndDate?: string;
  hireDate?: string;
  isRehire?: boolean;
  groupResponsibilityStartDate?: string;
  groupSeniorityStartDate?: string;
  supplier?: string;
  probationPeriod?: string;
  actualRegularizationDate?: string;
  movementType?: MovementType;
  reasonCode?: string;
  reasonSubCode?: string;
  assignmentIndicator?: AssignmentIndicator;
  legalEntityCode?: string;
  organizationId: string;
  positionId: string;
  jobGradeCode?: string;
  contractLocation?: string;
  workLocation?: string;
  isResponsibilitySystem?: boolean;
  approvalAuthority?: string;
  employeeGroupCode?: string;
  employeeSubgroupCode?: string;
  employeeNature?: string;
  groupAttrLevel?: string;
  payrollCompanyCode?: string;
  costLegalEntityCode?: string;
  trueResignationReasonHrbp?: string;
  trueResignationReasonSubHrbp?: string;
  handoverEmployeeId?: string;
  resignationDestination?: string;
  nonCompeteCompanySuggest?: boolean;
  nonCompeteWithPay?: boolean;
  salaryGroup?: string;
};

export type EmployeeAssignmentUpdateRequest = Partial<EmployeeAssignmentCreateRequest> & {
  /** 修改当前版本 / 按新生效日创建版本 */
  editMode?: EmployeeAssignmentEditMode;
};

export type EmployeeAssignmentListQuery = {
  asOfDate?: string;
};

export type ReportingLineListQuery = {
  keyword?: string;
  asOfDate?: string;
  lineType?: ReportingLineType;
  page: number;
  pageSize: number;
};

export type ReportingLineCreateRequest = {
  employeeId: string;
  managerEmployeeId: string;
  lineType?: ReportingLineType;
  effectiveStartDate: string;
  effectiveEndDate?: string;
};

export type ReportingLineUpdateRequest = {
  managerEmployeeId?: string;
  lineType?: ReportingLineType;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
};

export type EmployeeImportRowError = {
  rowNumber: number;
  field?: string;
  message: string;
};

export type EmployeeImportResult = {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: EmployeeImportRowError[];
};

export type EmployeeArchiveRecordBase = {
  id: string;
  employeeId: string;
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
  createdBy?: number;
  updatedBy?: number;
};

export type EmployeeFamilyMember = EmployeeArchiveRecordBase & {
  name?: string;
  relation?: string;
  relationLabel?: string;
  isInternalEmployee?: boolean;
  phone?: string;
  employer?: string;
  position?: string;
  birthDate?: string; // YYYY-MM-DD
  birthCertificate?: string;
};

export type EmployeeInternalRelative = EmployeeArchiveRecordBase & {
  relativeEmployeeId?: string;
  relativeEmployeeNo?: string;
  relativeEmployeeName?: string;
  relation?: string;
  relationLabel?: string;
  departmentName?: string;
  positionName?: string;
  jobGradeName?: string;
  hireDate?: string; // YYYY-MM-DD
  employmentStatus?: string;
  employmentStatusLabel?: string;
  lastWorkDay?: string; // YYYY-MM-DD
  remark?: string;
};

export type EmployeeCostCenterAllocation = EmployeeArchiveRecordBase & {
  legalEntityId?: string;
  costCenter?: string;
  percentage?: number;
  effectiveStartDate?: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
};

export type EmployeeContract = EmployeeArchiveRecordBase & {
  /** 生效日期（档案记录生效区间） */
  effectiveStartDate?: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
  contractCode?: string;
  /** @deprecated 旧字段：合同类型（已迁移为合同类别父子联动） */
  contractType?: string;
  /** 合同类别（父子值配置：CONTRACT_CATEGORY 一级） */
  contractCategory?: string;
  contractCategoryLabel?: string;
  /** 合同类别描述（父子值配置：CONTRACT_CATEGORY 二级，受一级联动） */
  contractCategoryDesc?: string;
  contractCategoryDescLabel?: string;
  legalEntityId?: string;
  operationType?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  /** @deprecated 旧字段：生效日期（已迁移为 effectiveStartDate/effectiveEndDate） */
  effectiveDate?: string; // YYYY-MM-DD
  status?: string;
  fileAttachmentId?: string;
  /** 合同签订次数（同员工合同按时间排序自动计算，只读） */
  signingTimes?: number;
  remark?: string;
};

export type EmployeeAgreement = EmployeeArchiveRecordBase & {
  /** 生效日期（档案记录生效区间） */
  effectiveStartDate?: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
  /** 协议编号（手填） */
  agreementCode?: string;
  /** 操作类型（数据字典：AGREEMENT_OPERATION_TYPE） */
  operationType?: string;
  /** 协议状态：VALID / INVALID */
  status?: string;
  /** 协议类别（数据字典：AGREEMENT_CATEGORY） */
  agreementCategory?: string;
  agreementCategoryLabel?: string;
  /** @deprecated 旧字段：协议类型（历史数据兼容） */
  agreementType?: string;
  legalEntityId?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  fileAttachmentId?: string;
  remark?: string;
};

export type EmployeeAttendanceCard = EmployeeArchiveRecordBase & {
  cardNo: string;
  effectiveStartDate: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
  status?: string;
  /** 是否参与考勤：YES / NO */
  participateInAttendance?: "YES" | "NO";
  remark?: string;
};

export type EmployeeAttendanceCardUpdateRequest = Partial<
  Omit<EmployeeAttendanceCard, "id" | "createdAt" | "updatedAt">
> & {
  /** 修改当前版本 / 按新生效日创建版本 */
  editMode?: EmployeeAttendanceCardEditMode;
};

export type EmployeeBankAccount = EmployeeArchiveRecordBase & {
  accountType?: string;
  countryCode?: string;
  bankId?: string;
  branchId?: string;
  accountNo?: string;
  /** 银行账号是否已脱敏展示 */
  accountNoMasked?: boolean;
  accountName?: string;
  currencyCode?: string;
  cnapsCode?: string;
  isPrimary?: boolean;
};

export type EmployeeSocialInsurance = EmployeeArchiveRecordBase & {
  socialSecurityNo?: string;
  /** 社保账号是否已脱敏展示 */
  socialSecurityNoMasked?: boolean;
  socialBase?: number;
  housingFundNo?: string;
  housingBase?: number;
  company?: string;
  insuranceRegion?: string;
  isCompanyPayroll?: boolean;
};

export type EmployeeSpecialBenefit = EmployeeArchiveRecordBase & {
  /** 是否有特殊福利：YES / NO */
  hasSpecialBenefit?: "YES" | "NO";
  /** 特殊福利截止日期 */
  endDate?: string; // YYYY-MM-DD
};

/** 工伤信息（员工服务多行） */
export type EmployeeWorkInjury = EmployeeArchiveRecordBase & {
  /** 事故发生日期 */
  accidentDate?: string; // YYYY-MM-DD
  /** 事故原因 */
  accidentReason?: string;
  /** 见证人 */
  witness?: string;
  /** 工伤认定日期 */
  recognitionDate?: string; // YYYY-MM-DD
  /** 伤残鉴定日期 */
  disabilityAssessmentDate?: string; // YYYY-MM-DD
  /** 是否认定为工伤：YES / NO */
  isRecognized?: "YES" | "NO";
  /** 是否参加劳动力鉴定：YES / NO */
  participatedLaborAssessment?: "YES" | "NO";
  /** 劳动力鉴定级别 */
  laborAssessmentLevel?: string;
  remark?: string;
};

/** 行政信息（员工服务，按生效日版本化） */
export type EmployeeAdminInfo = EmployeeArchiveRecordBase & {
  effectiveStartDate: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
  /** 状态：ACTIVE 有效 / INACTIVE 无效 */
  status?: string;
  /** 工作环境（字典 WORK_ENVIRONMENT：10/20/30） */
  workEnvironment?: string;
  workEnvironmentLabel?: string;
  /** 乘坐班车：YES / NO */
  takeShuttle?: "YES" | "NO";
  /** 停车证：YES / NO */
  parkingPermit?: "YES" | "NO";
};

export type EmployeeAdminInfoUpdateRequest = Partial<
  Omit<EmployeeAdminInfo, "id" | "createdAt" | "updatedAt" | "workEnvironmentLabel">
> & {
  editMode?: EmployeeAdminInfoEditMode;
};

/** 住宿信息（员工服务，按生效日版本化） */
export type EmployeeAccommodation = EmployeeArchiveRecordBase & {
  effectiveStartDate: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
  /** 状态：ACTIVE 有效 / INACTIVE 无效 */
  status?: string;
  /** 是否住宿：YES / NO */
  hasAccommodation?: "YES" | "NO";
  /** 住宿费汇总 */
  accommodationFeeTotal?: number;
};

export type EmployeeAccommodationUpdateRequest = Partial<
  Omit<EmployeeAccommodation, "id" | "createdAt" | "updatedAt">
> & {
  editMode?: EmployeeAccommodationEditMode;
};

export type EmployeeAttachment = EmployeeArchiveRecordBase & {
  attachmentType?: string;
  originalFilename?: string;
  storageKey?: string;
  uploadedAt?: string; // ISO-8601
};

export type EmployeeEducation = EmployeeArchiveRecordBase & {
  degree?: string;
  degreeLabel?: string;
  educationLevel?: string;
  educationLevelLabel?: string;
  isHighest?: boolean;
  countryRegion?: string;
  countryRegionLabel?: string;
  schoolName?: string;
  major?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  diplomaNo?: string;
  degreeNo?: string;
  attachmentIds?: string[];
};

export type EmployeeWorkExperience = EmployeeArchiveRecordBase & {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  employerName?: string;
  department?: string;
  position?: string;
  leaveReason?: string;
  lastSalary?: number;
  referee?: string;
  refereePhone?: string;
  payFrequency?: string;
  currencyCode?: string;
  description?: string;
};

/** 资格证书（技能类） */
export type EmployeeQualification = EmployeeArchiveRecordBase & {
  skillType?: string;
  firstIssueDate?: string; // YYYY-MM-DD 最早获证日期
  expiryDate?: string; // YYYY-MM-DD 有效日到期日
  reviewDate?: string; // YYYY-MM-DD 复审日期
  certificateName?: string;
  certificateNo?: string;
  handlerName?: string; // 经办人
  issuingOrg?: string; // 发证机构
  remark?: string;
  attachmentIds?: string[];
};

/** 职称证书 */
export type EmployeeTitleCertificate = EmployeeArchiveRecordBase & {
  titleName?: string;
  titleLevel?: string;
  approvalDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  certificateNo?: string;
  issuingOrg?: string; // 签发单位
  remark?: string;
  attachmentIds?: string[];
};

export type EmployeeReward = EmployeeArchiveRecordBase & {
  effectiveDate?: string; // YYYY-MM-DD
  archiveDate?: string; // YYYY-MM-DD
  type?: string;
  level?: string;
  witness?: string;
  amount?: number;
  paymentMethod?: string;
  issuingOrg?: string;
  documentNo?: string;
  description?: string;
};

export type EmployeePenalty = EmployeeArchiveRecordBase & {
  effectiveDate?: string; // YYYY-MM-DD
  archiveDate?: string; // YYYY-MM-DD
  /** 惩处类型（父子值 PENALTY_TYPE 一级） */
  type?: string;
  /** 惩处类别（父子值 PENALTY_TYPE 二级；经济处罚无子项） */
  level?: string;
  witness?: string;
  amount?: number;
  /** 扣款方式（字典 PENALTY_PAYMENT_METHOD） */
  paymentMethod?: string;
  /** 是否涉及赔偿 */
  involvesCompensation?: boolean;
  issuingOrg?: string;
  documentNo?: string;
  description?: string;
};

export type EmployeeTrainingRecord = EmployeeArchiveRecordBase & {
  trainingName?: string;
  trainingType?: string;
  provider?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  hours?: number;
  result?: string;
  certificateNo?: string;
  attachmentId?: string;
  remark?: string;
};

export type EmployeePerformanceRecord = EmployeeArchiveRecordBase & {
  period?: string;
  rating?: string;
  ratingLabel?: string;
  score?: number;
  reviewerName?: string;
  reviewDate?: string; // YYYY-MM-DD
  sourceType?: string;
  remark?: string;
};

export type EmployeeValuesAssessment = EmployeeArchiveRecordBase & {
  period?: string;
  dimension?: string;
  score?: number;
  level?: string;
  assessorName?: string;
  assessDate?: string; // YYYY-MM-DD
  remark?: string;
};

export type EmployeeTalentReview = EmployeeArchiveRecordBase & {
  reviewCycle?: string;
  gridPosition?: string;
  potentialLevel?: string;
  performanceLevel?: string;
  reviewerName?: string;
  reviewDate?: string; // YYYY-MM-DD
  remark?: string;
};

export type EmployeeProject = EmployeeArchiveRecordBase & {
  projectName?: string;
  projectCode?: string;
  role?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  contribution?: string;
  remark?: string;
};

export type EmployeeAgentAssignment = EmployeeArchiveRecordBase & {
  agentId?: string;
  agentName?: string;
  assignmentType?: string;
  effectiveStartDate?: string; // YYYY-MM-DD
  effectiveEndDate?: string; // YYYY-MM-DD
  remark?: string;
};

export type EmployeeArchive = {
  familyMembers: EmployeeFamilyMember[];
  internalRelatives: EmployeeInternalRelative[];
  idDocuments: EmployeeIdDocument[];
  costCenterAllocations: EmployeeCostCenterAllocation[];
  contracts: EmployeeContract[];
  agreements: EmployeeAgreement[];
  attendanceCards: EmployeeAttendanceCard[];
  bankAccounts: EmployeeBankAccount[];
  socialInsurances: EmployeeSocialInsurance[];
  specialBenefits: EmployeeSpecialBenefit[];
  workInjuries: EmployeeWorkInjury[];
  adminInfos: EmployeeAdminInfo[];
  accommodations: EmployeeAccommodation[];
  attachments: EmployeeAttachment[];
  educations: EmployeeEducation[];
  workExperiences: EmployeeWorkExperience[];
  qualifications: EmployeeQualification[];
  titleCertificates: EmployeeTitleCertificate[];
  rewards: EmployeeReward[];
  penalties: EmployeePenalty[];
  trainingRecords: EmployeeTrainingRecord[];
  performanceRecords: EmployeePerformanceRecord[];
  valuesAssessments: EmployeeValuesAssessment[];
  talentReviews: EmployeeTalentReview[];
  projects: EmployeeProject[];
  agentAssignments: EmployeeAgentAssignment[];
};

export type EmployeeArchiveResourcePath =
  | "family-members"
  | "internal-relatives"
  | "id-documents"
  | "cost-center-allocations"
  | "contracts"
  | "agreements"
  | "attendance-cards"
  | "bank-accounts"
  | "social-insurances"
  | "special-benefits"
  | "work-injuries"
  | "admin-infos"
  | "accommodations"
  | "attachments"
  | "educations"
  | "work-experiences"
  | "qualifications"
  | "title-certificates"
  | "rewards"
  | "penalties"
  | "training-records"
  | "performance-records"
  | "values-assessments"
  | "talent-reviews"
  | "projects"
  | "agent-assignments";

export type EmployeeArchiveResourceByPath = {
  "family-members": EmployeeFamilyMember;
  "internal-relatives": EmployeeInternalRelative;
  "id-documents": EmployeeIdDocument;
  "cost-center-allocations": EmployeeCostCenterAllocation;
  contracts: EmployeeContract;
  agreements: EmployeeAgreement;
  "attendance-cards": EmployeeAttendanceCard;
  "bank-accounts": EmployeeBankAccount;
  "social-insurances": EmployeeSocialInsurance;
  "special-benefits": EmployeeSpecialBenefit;
  "work-injuries": EmployeeWorkInjury;
  "admin-infos": EmployeeAdminInfo;
  accommodations: EmployeeAccommodation;
  attachments: EmployeeAttachment;
  educations: EmployeeEducation;
  "work-experiences": EmployeeWorkExperience;
  qualifications: EmployeeQualification;
  "title-certificates": EmployeeTitleCertificate;
  rewards: EmployeeReward;
  penalties: EmployeePenalty;
  "training-records": EmployeeTrainingRecord;
  "performance-records": EmployeePerformanceRecord;
  "values-assessments": EmployeeValuesAssessment;
  "talent-reviews": EmployeeTalentReview;
  projects: EmployeeProject;
  "agent-assignments": EmployeeAgentAssignment;
};

type EmployeeArchiveManagedFields =
  | "id"
  | "employeeId"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "updatedBy";

export type EmployeeArchiveCreateRequest<T> = Omit<T, EmployeeArchiveManagedFields>;
export type EmployeeArchiveUpdateRequest<T> = Partial<
  Omit<T, EmployeeArchiveManagedFields>
>;

export type EmployeeImportErrorReportRequest = {
  errors: EmployeeImportRowError[];
};

export type EmployeeApi = {
  /** GET /api/v1/employees?page=&pageSize=&keyword=&status=&organizationId= */
  listEmployees: (query: EmployeeListQuery) => Promise<ApiResponse<PageResult<Employee>>>;
  /** GET /api/v1/employees/form-options */
  getEmployeeFormOptions: () => Promise<ApiResponse<EmployeeFormOptions>>;
  /** GET /api/v1/employees/{id}?asOfDate=YYYY-MM-DD */
  getEmployee: (id: string) => Promise<ApiResponse<Employee>>;
  /** GET /api/v1/employees/{id}/master-versions */
  listEmployeeMasterVersions: (employeeId: string) => Promise<ApiResponse<EmployeeMasterVersion[]>>;
  /** POST /api/v1/employees */
  createEmployee: (req: EmployeeCreateRequest) => Promise<ApiResponse<Employee>>;
  /** PUT /api/v1/employees/{id} */
  updateEmployee: (id: string, req: EmployeeUpdateRequest) => Promise<ApiResponse<Employee>>;
  /** GET /api/v1/employees/{id}/id-documents */
  listEmployeeIdDocuments: (employeeId: string) => Promise<ApiResponse<EmployeeIdDocument[]>>;
  /** GET /api/v1/employees/assignment-form-options */
  getEmployeeAssignmentFormOptions: () => Promise<ApiResponse<EmployeeAssignmentFormOptions>>;
  /** GET /api/v1/employees/{id}/assignments?asOfDate= */
  listEmployeeAssignments: (
    employeeId: string,
    query?: EmployeeAssignmentListQuery,
  ) => Promise<ApiResponse<EmployeeAssignment[]>>;
  /** POST /api/v1/employees/{id}/assignments */
  createEmployeeAssignment: (
    employeeId: string,
    req: EmployeeAssignmentCreateRequest,
  ) => Promise<ApiResponse<EmployeeAssignment>>;
  /** PUT /api/v1/employees/{employeeId}/assignments/{assignmentId} */
  updateEmployeeAssignment: (
    employeeId: string,
    assignmentId: string,
    req: EmployeeAssignmentUpdateRequest,
  ) => Promise<ApiResponse<EmployeeAssignment>>;
  /** GET /api/v1/employees/{id}/movements */
  listEmployeeMovements: (employeeId: string) => Promise<ApiResponse<EmployeeMovement[]>>;
  /** GET /api/v1/employees/import-template */
  downloadEmployeeImportTemplate: () => Promise<Blob>;
  /** POST /api/v1/employees/import (multipart) */
  importEmployees: (file: File) => Promise<ApiResponse<EmployeeImportResult>>;
  /** POST /api/v1/employees/import-error-report */
  downloadEmployeeImportErrorReport: (
    req: EmployeeImportErrorReportRequest,
  ) => Promise<Blob>;
  /** GET /api/v1/employees/export */
  exportEmployees: (query?: Pick<EmployeeListQuery, "keyword" | "status" | "organizationId">) => Promise<Blob>;
  /** GET /api/v1/employees/{id}/archive */
  getEmployeeArchive: (employeeId: string) => Promise<ApiResponse<EmployeeArchive>>;
  /**
   * 资源路径：
   * family-members | internal-relatives | id-documents | cost-center-allocations
   * contracts | agreements | attendance-cards | bank-accounts | social-insurances
   * special-benefits | work-injuries | admin-infos | accommodations | attachments | educations
   * work-experiences | qualifications | title-certificates | rewards | penalties | training-records
   * performance-records | values-assessments | talent-reviews | projects | agent-assignments
   */
  listEmployeeArchiveResource: <TPath extends EmployeeArchiveResourcePath>(
    employeeId: string,
    resourcePath: TPath,
  ) => Promise<ApiResponse<EmployeeArchiveResourceByPath[TPath][]>>;
  createEmployeeArchiveResource: <TPath extends EmployeeArchiveResourcePath>(
    employeeId: string,
    resourcePath: TPath,
    req: EmployeeArchiveCreateRequest<EmployeeArchiveResourceByPath[TPath]>,
  ) => Promise<ApiResponse<EmployeeArchiveResourceByPath[TPath]>>;
  updateEmployeeArchiveResource: <TPath extends EmployeeArchiveResourcePath>(
    employeeId: string,
    resourcePath: TPath,
    id: string,
    req: EmployeeArchiveUpdateRequest<EmployeeArchiveResourceByPath[TPath]>,
  ) => Promise<ApiResponse<EmployeeArchiveResourceByPath[TPath]>>;
  deleteEmployeeArchiveResource: (
    employeeId: string,
    resourcePath: EmployeeArchiveResourcePath,
    id: string,
  ) => Promise<ApiResponse<{ id: string; employeeId: string }>>;

  /** GET /api/v1/reporting-lines?page=&pageSize=&keyword=&asOfDate=&lineType= */
  listReportingLines: (query: ReportingLineListQuery) => Promise<ApiResponse<PageResult<ReportingLine>>>;
  /** POST /api/v1/reporting-lines */
  createReportingLine: (req: ReportingLineCreateRequest) => Promise<ApiResponse<ReportingLine>>;
  /** PUT /api/v1/reporting-lines/{id} */
  updateReportingLine: (id: string, req: ReportingLineUpdateRequest) => Promise<ApiResponse<ReportingLine>>;
  /** DELETE /api/v1/reporting-lines/{id} */
  deleteReportingLine: (id: string) => Promise<ApiResponse<{ id: string }>>;
};

