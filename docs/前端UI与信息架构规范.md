# 前端 UI 与信息架构规范

> **设计基准**：`client/` 正式实现（`AdminLayout`、`admin-nav`、已实现 Admin 页面）与本规范  
> 新页面须对齐本规范视觉与交互；组件统一使用 **shadcn/ui + Tailwind**。

## 1. 设计原则

| 原则 | 说明 |
| --- | --- |
| 顶部导航 + 内容区 | **不用左侧固定边栏**；一级模块在顶栏，二级入口用 Mega Menu |
| 契约与权限一致 | 菜单项绑定 `permission` 点位；无权限项灰显且不可点，后端仍须鉴权 |
| 列表优先、详情抽屉 | 主数据列表全页展示；查看/轻量编辑用右侧 **Sheet（抽屉）**，避免频繁整页跳转 |
| 状态完整 | 每页/每表须处理 **loading / error / empty**；禁止 mock 数据 |
| 敏感字段可见即脱敏 | 手机号、证件号等展示脱敏 + `脱敏` 标签；查看明文须权限 + 审计 |
| 语义化 Token | 颜色/圆角/阴影对齐 shadcn 命名，便于 `tailwind-theme.css` 映射 |
| 无障碍与键盘 | Skip link、`focus-visible`、表格行 Enter 打开详情、`Esc` 关闭浮层 |
| 响应式 | 内容区 `max-width: 1440px`；`<1280px` / `<640px` 有明确折行规则 |

## 2. 视觉设计系统

### 2.1 字体

- **中文**：Noto Sans SC（自托管 woff2，禁止依赖 Google Fonts CDN）
- **西文/数字**：Inter；等宽字段（工号、时间戳）用 `font-mono`
- **栈**：`"Noto Sans SC", "Inter", "Segoe UI", "PingFang SC", "Microsoft YaHei UI", sans-serif`
- **基准字号**：正文 14px / 行高 1.5715；表头/标签 11–13px；页面标题 22px

### 2.2 色彩与 Token（浅色基准）

| Token | 用途 | 浅色参考值 |
| --- | --- | --- |
| `--primary` | 主色、选中、链接 | `#2563eb` |
| `--background` / `--background-subtle` | 页面底 / 卡片底 | `#ffffff` / `#f8fafc` |
| `--foreground` / `--muted-fg` | 主文字 / 次要文字 | `#0f172a` / `#64748b` |
| `--border` | 分割线、输入框边框 | `#e2e8f0` |
| `--destructive` / `--success` / `--warning` | 错误 / 成功 / 警告 | `#ef4444` / `#059669` / `#d97706` |
| `--radius` / `--radius-sm` | 卡片 / 控件圆角 | `10px` / `8px` |

主色渐变仅用于 **Logo 图标、用户头像** 等品牌点缀，不滥用大面积渐变底。

### 2.3 暗色模式

- 支持 **`light` | `dark` | `system`** 三档；`system` 跟随 `prefers-color-scheme`
- 持久化到 `localStorage`；顶栏按钮快捷切换；命令面板亦可切换
- 实现：`dark` class + CSS 变量覆盖（见 `client/src/index.css`）
- 正式系统：与 shadcn `dark` 类或 `next-themes` 等价方案对齐

### 2.4 动效

- 过渡：`0.18s cubic-bezier(.4,0,.2,1)`
- 页面进入：轻微 `translateY(6px)` + fade（`pageIn`）
- 下拉/Mega Menu/命令面板：`menuIn` 缩放淡入
- **`prefers-reduced-motion: reduce`** 时禁用动画

### 2.5 控件尺寸

| 控件 | 高度 | 备注 |
| --- | --- | --- |
| 默认按钮 / 输入 / Select | 38px | 主列表页操作区可用 36px |
| 小按钮 `btn-sm` | 32px | 表格行内操作 |
| 顶栏 | 56px | sticky，`z-index: 100` |

## 3. 全局布局

```text
┌─────────────────────────────────────────────────────────────┐
│ Top Nav（sticky）                                            │
│ Logo | 工作台 | 组织与员工▼ | 平台▼ | 报表 | 设置 | 搜索⌘K … │
├─────────────────────────────────────────────────────────────┤
│ Breadcrumb Bar：模块 › 分组 › 当前页                          │
├─────────────────────────────────────────────────────────────┤
│ Main Content（padding 24px，max-width 1440px，居中）          │
│   Page Header：标题 + 描述 | 操作区（导入导出组 + 主 CTA）     │
│   Filters Bar（列表页）                                       │
│   Table Card / Dashboard / Form                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 顶栏（Top Nav）

- **左侧**：Logo（`人力资源平台` + HR 渐变图标）
- **中部**：一级模块导航
- **右侧**：全局搜索（打开命令面板，`Ctrl/Cmd+K`）、主题切换、通知（红点角标）、用户头像

### 3.2 面包屑

- 固定在顶栏下方；格式：`{一级模块} › {Mega 列标题} › {当前页}`（单页模块可仅显示页名）
- 当前页名称 **加粗**；分隔符 `›`

### 3.3 页面头（Page Header）

- **标题区**：`h1` 标题 + 一行 `page-desc` 说明业务含义
- **操作区**（右对齐）：
  - 次要操作：`btn-group` 合并（如 **导入 | 导出**）
  - 分隔线后与 **主 CTA**（`btn-primary`，如「新建员工」）并列
- 开发态可选 `Slice` / `/admin` 徽章（`data-dev-only`，生产构建隐藏）

## 4. 信息架构与菜单（Admin `/admin/*`）

> MVP **仅实现 Admin**；菜单结构为三端共用 API 预留，MSS/ESS 后补独立 Layout。
>
> **对照系统方案**：`HR系统完整系统方案.md` 将能力分为「业务应用层 / 协同流程层 / 平台能力层」。Admin 端的信息架构采用“少量一级入口 + Mega Menu 承载二级分组”的方式：
>
> - 顶栏一级更偏“工作区/领域入口”（便于日常使用）
> - Mega Menu 二级分组更贴近“领域中心/配置中心”（与模块边界一致）
> - MVP 未实现的模块可以预留路由与菜单，但需标记“后补”，避免误导验收范围

### 4.1 一级模块

| 一级 | 类型 | 说明 |
| --- | --- | --- |
| 工作台 | 直达 | 人力驾驶舱 + 我的待办摘要（协同流程层入口的“首页聚合”） |
| 组织与员工 | Mega Menu（3 列） | 组织岗位中心 + 员工主数据中心 + 员工生命周期（入转调离/合同）+ 员工服务（证明/工单） |
| 平台 | Mega Menu（3 列） | 流程引擎 + 任务中心 + 消息/提醒 + 权限中心 + 审计 + 表单/规则/集成配置 |
| 报表 | 直达 | 报表分析中心（经营看板、指标口径、导出） |
| 设置 | 直达 | 系统管理与基础配置（字典、编码、参数等；尽量“少入口，强搜索”） |

### 4.2 二级菜单明细

#### 组织与员工

| 分组 | 菜单项 | `data-page` | 权限点 | 路由（建议） | Slice |
| --- | --- | --- | --- | --- | --- |
| 组织岗位 | 组织架构 | `org-structure` | `organization:view` | `/admin/org/structure` | 5 |
| | 岗位体系 | `position-system` | `position:view` | `/admin/org/positions` | 5 |
| | 编制管理 | `headcount` | `headcount:view` | `/admin/org/headcount` | 6 |
| 员工主数据 | 员工花名册 | `roster` | `employee:roster:view` | `/admin/employees/roster` | 7（含 27 项档案 Sheet） |
| | 档案详情 | `employee-archive` | `employee:detail:view` | 花名册内抽屉（6 Tab），无独立列表页 | 7 |
| | 汇报关系 | `reporting-line` | `reporting-line:view` | `/admin/employees/reporting-lines` | 7.6 |
| 入转调离 | 入职办理 | `onboarding` | `onboarding:view` | `/admin/onboarding` | 8 |
| | 人事异动 | `movement` | `employee:movement:view` | `/admin/movements` | 9–10 |
| | 离职办理 | `offboarding` | `offboarding:view` | `/admin/offboarding` | 12 |
| | 合同管理 | `contract` | `contract:view` | `/admin/contracts` | 11 |
| 员工服务 | 证明申请/开具（后补） | `certificates` | `certificate:view` | `/admin/services/certificates` | 13 |
| | 服务工单（后补） | `service-tickets` | `service:ticket:view` | `/admin/services/tickets` | — |

#### 平台

| 分组 | 菜单项 | `data-page` | 权限点 | 路由（建议） | Slice |
| --- | --- | --- | --- | --- | --- |
| 协同流程 | 流程配置 | `workflow` | `workflow:manage` | `/admin/platform/workflow` | 4 |
| | 待办中心 | `tasks` | `workflow:task:view` | `/admin/platform/tasks` | 4 |
| | 消息中心（后补） | `messages` | `message:view` | `/admin/platform/messages` | — |
| | 日历提醒（后补） | `calendar` | `calendar:view` | `/admin/platform/calendar` | — |
| 权限与安全 | RBAC 权限 | `permission` | `permission:manage` | `/admin/platform/permissions` | 3 |
| | 数据范围/字段权限（后补） | `data-scope` | `permission:data-scope:manage` | `/admin/platform/data-scope` | 3+ |
| | 审计日志 | `audit` | `audit:view` | `/admin/platform/audit` | 1 |
| 配置与集成 | 表单配置（后补） | `forms` | `form:manage` | `/admin/platform/forms` | — |
| | 规则配置（后补） | `rules` | `rule:manage` | `/admin/platform/rules` | — |
| | 集成中心（后补） | `integrations` | `integration:manage` | `/admin/platform/integrations` | — |
| | API 契约（开发） | `contract-first` | （开发） | 文档站或 `/admin/dev/api-contract` | 0 |
| | 健康检查（运维） | `health` | （运维） | 外链或 `/admin/dev/health` | 0 |

#### 直达模块

| 菜单项 | 路由 | 说明 |
| --- | --- | --- |
| 工作台 | `/admin/dashboard` | 指标卡 + 待办列表 + 编制使用率 |
| 报表概览 | `/admin/reports` | Slice 14 |
| 系统设置 | `/admin/settings` | 字典、编码规则、系统参数等（Slice 2 起逐步接入；优先用全局搜索直达） |

### 4.3 Mega Menu 交互

- **桌面**：`mouseenter` 打开，`mouseleave` 关闭；**触屏/无 hover**：点击一级按钮 toggle
- 面板：`min-width 560px`，3 列 grid，圆角 14px，大阴影
- 列标题 13px 加粗；链接项 hover/active 使用 `primary-light` 背景
- 点击二级链接：关闭 Mega Menu、更新面包屑、高亮当前 `mega-link` 与一级 `nav-item`
- 无权限：`.is-denied`（opacity 降低 + 不可点）；点击提示无权限（生产由 `usePermission` 裁剪）

### 4.4 菜单配置化（正式实现）

```text
client/src/config/admin-nav.ts   # 菜单树 + permission + route + icon
client/src/layouts/AdminLayout.tsx
client/src/hooks/usePermission.ts
```

路由与菜单 **单一数据源**；React Router `NavLink` 与 Mega Menu 共用配置。

## 5. 页面模式与操作体验

### 5.1 列表页（以员工花名册为基准）

**筛选区（Filters Bar）**

- 白底卡片条：左侧 `筛选` 标签（12px 大写）
- 筛选项：部门、状态、时间预设、关键词搜索（姓名/工号/手机号）
- 可选：**法人主体** 全局筛选（多法人场景）
- 关键词 **debounce 280ms**；变更筛选重置到第 1 页
- 已选条件以 **filter chips** 展示，可逐项清除 + 「清除全部」

**表格（Table Card）**

- 外框卡片：圆角 + 细边框 + `shadow-sm`
- 表头：sticky、`muted` 背景、11px 大写列名
- 行 hover 高亮；整行可点（Enter 打开详情）
- **行内操作**：查看、编辑；默认 hover 显示，触屏设备常显
- 员工列：圆形头像（姓首字）+ 姓名链接 + 副行（脱敏手机号 + `脱敏` 标签）
- 状态列：**胶囊 Badge** + 色点（在职绿 / 试用黄 / 待离职红 / 待入职蓝）
- 工号、时间：**等宽小字**

**分页脚**

- 左：`共 N 条记录 · 第 x/y 页`（可附当前法人）
- 右：页码按钮；当前页 `primary` 实心

**三态**

| 状态 | 表现 |
| --- | --- |
| loading | 表格区 skeleton 行，隐藏分页脚 |
| error | 页面顶部 `error-banner`（浅红底）+ **重试** |
| empty | 居中图标 + 标题 + 说明 + 「清除筛选」 |

**顶栏操作**

- 导入 / 导出：权限控制 + Toast 提示；导出须 `report:export` + 审计
- 新建：打开抽屉「新建」模式

### 5.2 员工档案抽屉（Sheet）

| 模式 | 标题 | Tab | 底部按钮 |
| --- | --- | --- | --- |
| 查看 | 员工详情 | **个人信息** / **工作信息** / **员工服务** / **背景信息** / **人才发展** / **异动记录** | 关闭、**编辑** |
| 编辑 | 编辑员工 | 无 Tab | 取消、**保存** |
| 新建 | 新建员工 | 无 Tab | 取消、**保存** |

- 宽度：`min(560px, 100vw)`；右侧滑入；遮罩点击关闭
- **查看模式**（对齐 `docs/领域模型与表设计-MVP.md` §4.1 共 **27 项**档案二级模块，**均属 Slice 7**）：
  - 顶部 **Hero 摘要**（头像、姓名、工号/部门/岗位、状态）固定在 Tab 上方
  - Tab 切换不关闭抽屉；切换后内容区滚回顶部
  - **个人信息**（#1–5）：个人基础、证件（多行）、联系、地址、家属、紧急联系人、内部亲属（多行）
  - **工作信息**（#6–11）：当前任职（岗位/组织/雇工/工作关系）、任职历史、成本中心分摊（多行）、合同与协议（多行）
  - **员工服务**（#12–17 + 工伤）：考勤卡、银行卡、社保公积金、特殊福利、工伤信息、行政信息、住宿信息、附件（多行/受控下载）
  - **背景信息**（#18–21）：教育、工作经历、资格证书、职称证书、奖惩（均多行）
  - **人才发展**（#22–27）：培训记录、历史绩效、价值观评价、人才盘点、项目信息、智能体归属（均多行；**档案记录**，非 LMS/绩效/盘点模块入口）
  - **异动记录**：纵向时间轴，节点展示操作码中文名 + 原因描述；当前任职相关节点高亮 `is-current`
- **编辑/新建**：双列表单网格；必填 `*`；字段级错误红框 + 文案；提交前校验，失败 Toast + focus 首个错误
- `Esc`、关闭按钮、取消按钮均关闭抽屉

### 5.3 工作台（Dashboard）

- 首行 **4 列指标卡**：在职人数、待办审批、本月入职、合同即将到期
- 每卡：彩色图标底 + 标签 + 大数字 + 环比/警示副文案
- 下方 **2 列布局**（窄屏 1 列）：
  - 我的待办（可点击跳转待办中心）
  - 编制使用率进度条 + 计划/已用/在途说明

### 5.4 待办中心

- 标准表格：任务、类型、发起人、到达时间、优先级
- 行内 **通过 / 驳回** 主操作常显
- 审批成功 Toast 提示业务副作用（如写入异动）

### 5.5 入职办理

- 列表列：候选人、目标部门、预计入职、**状态机标签**（`DRAFT|PENDING|IN_PROGRESS|...`）、进度文案
- 状态样式：`flow-status` 等宽小字胶囊（与业务枚举一致，禁止 Controller 硬编码文案）
- 主操作：**新建待入职**

### 5.6 未实现页面（占位）

- 使用 `empty-card` 虚线框说明：按垂直切片逐步实现
- 列出契约优先、鉴权、脱敏、effective dating 等约束（与项目架构铁律一致）

## 6. 全局能力

### 6.1 命令面板（Command Palette）

- 快捷键：`Ctrl/Cmd + K`；`Esc` 关闭
- 分组：快捷操作、外观、员工搜索…
- 支持键盘 ↑↓ 选择、Enter 执行、输入过滤
- 正式实现：`cmdk` 或 shadcn `Command` 组件

### 6.2 反馈（Toast）

- 位置：右下固定栈
- 类型：`success` | `info` | `warn` | `error`；语义色底 + 图标
- 自动消失 ~3.2s；禁止 `alert` / `confirm`

### 6.3 通知

- 顶栏铃铛 + 红点（有未读）
- MVP 可仅 UI 占位，Slice 4 后对接消息 API

## 7. 业务 UI 约束（与领域模型一致）

| 场景 | UI 要求 |
| --- | --- |
| 任职/组织/汇报 | 展示 `effective_start_date` / `effective_end_date`；支持 `asOfDate` 查询入口 |
| 敏感字段 | 列表与详情默认脱敏；`sensitive-tag` 标示 |
| 导出 | 独立权限 + 确认提示 + 审计 |
| 入职/离职/异动 | 状态标签与后端状态机枚举一致 |
| 异动时间轴 | 写入 `employee_movement`；展示 `movement_type` + `reason_code` 中文；当前任职标记「当前」 |

## 8. React 实现映射

| UI 概念 | shadcn / 项目组件 |
| --- | --- |
| `ui-input` | `Input`（可带前置搜索图标） |
| `ui-select` | `Select` 或 `Popover` + `Command` |
| `btn` / `btn-primary` | `Button` variant=`default`/`outline`/`ghost` |
| `sheet` | `Sheet` |
| `data-table` | 项目表格规范 + `@tanstack/react-table`（如需） |
| `status-badge` | `Badge` + 自定义语义 variant |
| `command-palette` | `CommandDialog` |
| Toast | `sonner` |
| 表单 | `Form` + RHF + `zod` |
| 主题 | `next-themes` 或等价 |
| 图标 | **仅** `lucide-react` |

## 9. 响应式断点

| 断点 | 行为 |
| --- | --- |
| `≤1279px` | 顶栏字号缩小；Logo 文字隐藏；Dashboard 指标 2 列；表单/详情网格 1 列 |
| `≤640px` | 主内容 padding 16px；页头操作区换行；搜索按钮仅显示图标 |

## 10. 验收检查单（每个页面）

- [ ] 视觉与 `AdminLayout` 布局结构一致（顶栏 + 面包屑 + 页头 + 内容）
- [ ] 菜单路由、权限点与本文档 §4 一致
- [ ] loading / error / empty 三态可用
- [ ] 对接真实 API（禁止 mock）
- [ ] 敏感字段脱敏；导出/明文查看有权限与审计
- [ ] 键盘与 `focus-visible` 可用；`prefers-reduced-motion` 生效
- [ ] 暗色模式下对比度正常

---

*本文档以 `client/` 已实现页面为实践基准；新页面开发时随 `client/` 演进同步更新；冲突时以本文档与 `AGENTS.md` MVP 范围为准。*
