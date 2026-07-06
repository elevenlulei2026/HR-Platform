# HR Platform — AI Agent 指南

企业级人力资源数字化平台。用 Cursor 以**垂直切片**方式开发，禁止水平铺开（先写完全部表/全部 API）。

## 项目结构

```text
client/     # React 19 + Vite + shadcn/ui
server/     # Java 17 + Spring Boot 3 + MyBatis-Plus + Flyway
shared/     # 前后端契约 api.interface.ts
docs/       # 执行层文档（AI 优先读这里）
```

## 文档索引（按任务阅读）

| 优先级 | 文档 | 何时读 |
| --- | --- | --- |
| P0 | `docs/MVP-AI开发路线图.md` | 确定当前 Slice、验收标准 |
| P0 | `docs/领域模型与表设计-MVP.md` | 写 Entity / Migration / API 前 |
| P0 | `shared/api.interface.ts` | 任何接口变更前后 |
| P0 | `docs/前端UI与信息架构规范.md` | 做 Layout、菜单、任何 Admin 页面 / 交互前（愿景；**实现以 `client/` + `.cursor/rules/frontend.mdc` 为准**） |
| P1 | `docs/产品与技术全面优化方案.md` | 架构决策、范围争议 |
| P1 | `client/src/layouts/AdminLayout.tsx` 等已实现 Admin 页面 | 布局、菜单、页面模式对照 |
| P2 | `HR系统完整系统方案.md` | 业务全景、模块边界 |
| P2 | `.cursor/rules/*.mdc` | 编码规范（按文件自动加载） |

## 当前阶段

**阶段 0**：脚手架尚未初始化。下一步 Slice 0 — 创建 `client/`、`server/`、`shared/` 并实现健康检查联通。

完整任务清单见 `docs/MVP-AI开发路线图.md`。

## 架构铁律

1. **契约优先**：先改 `shared/api.interface.ts`，再写 Java DTO/Controller 和前端 API。
2. **模块化单体**：`platform` ← `core` ← `modules`，禁止 `core` 依赖 `modules`，禁止跨模块直接改表。
3. **生效日期**：组织、任职、汇报关系变更必须带 `effective_start_date` / `effective_end_date`。
4. **状态机在 Domain 层**：流程引擎只管审批链，业务状态禁止写在 Controller。
5. **权限后端强制**：功能点 + 数据范围；薪酬/证件/导出单独授权；禁止仅前端隐藏按钮。
6. **禁止 mock 数据**：前端对接真实 API，页面须处理 loading / error / empty。
7. **敏感字段**：加密存储、脱敏展示、查看写审计。

## 前端路由（三端规划，MVP 仅 Admin）

**MVP 阶段只实现 `/admin/*`**；`/mss/*`、`/ess/*` 路由域可预留目录结构，但不做页面与独立 Layout，后补。

| 前缀 | 用户 | MVP | 后补范围 |
| --- | --- | --- | --- |
| `/admin/*` | HR / 系统管理员 | ✅ 全部 MVP 功能 | — |
| `/mss/*` | 直属主管 | — | 团队待办、审批 |
| `/ess/*` | 员工 | — | 我的档案、待办、证明申请 |

MVP 中需员工/主管参与的能力（入职信息采集、证明申请、审批待办等）**均在 Admin 端由 HR 代操作或统一待办中心处理**，API 与流程实例按三端共用设计，便于后补前端。

## 前端 UI 基准（摘要）

- **布局**：顶栏导航 + 面包屑 + 内容区（不用左侧边栏）；详见 `docs/前端UI与信息架构规范.md`
- **菜单**：工作台 | 组织与员工（Mega）| 平台（Mega）| 报表 | 设置；每项绑定权限点与 `/admin/*` 路由
- **交互**：列表 + 右侧 Sheet 抽屉详情；命令面板 `Ctrl/Cmd+K`；loading/error/empty 三态；暗色模式
- **视觉**：对齐 `client/src/index.css` 语义 token 与 shadcn 组件；共享壳层见 `components/admin/`；图标仅 `lucide-react`

## Java 包结构

```text
com.hrplatform.platform.*   # auth, workflow, audit, file, config
com.hrplatform.core.*       # organization, employee, headcount
com.hrplatform.modules.*    # onboarding, employee_relations, offboarding ...
com.hrplatform.integration.*
```

## API 约定

- 前缀：`/api/v1/`
- 统一响应：`{ code, message, data, traceId }`
- 分页：`{ items, total, page, pageSize }`
- 历史快照查询参数：`asOfDate=YYYY-MM-DD`
- JSON 字段：camelCase

## 单次任务建议粒度

- 1–3 张表 + Flyway 脚本
- 1 组 REST API（含权限）
- 1 个列表页或 1 个表单页
- 或 1 条端到端业务流程

## Prompt 模板

```text
实现【Slice X.Y：功能名】。
先读 AGENTS.md、docs/领域模型与表设计-MVP.md 相关表、shared/api.interface.ts。
遵循 .cursor/rules。验收：【列出 3–5 条】。
```

## MVP 不做

完整 ATS、薪酬规则引擎、**绩效校准流程**、**LMS 培训系统**、AI 简历解析。招聘仅「手动创建待入职」入口。

**档案 vs 模块（Slice 7 必读）**：培训记录、历史绩效、价值观评价、人才盘点、项目信息、智能体归属等 **必须在员工档案内落表并可维护**（见 `docs/领域模型与表设计-MVP.md` §4.1 #22–27）；**不**开发对应的独立业务系统（排课、校准会议、盘点流程、PMO、智能体编排）。

**MSS / ESS 前端**：主管自助、员工自助页面与独立 Layout；相关能力 MVP 仅在 Admin 交付。
