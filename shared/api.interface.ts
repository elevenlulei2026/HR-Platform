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

