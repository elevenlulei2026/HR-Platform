# HR Platform

企业级人力资源数字化运营平台。

## 项目结构

```
├── client/    # React 前端
├── server/    # Java 后端（Spring Boot）
└── shared/    # 前后端共享类型（api.interface.ts）
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 19 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| 路由 | React Router DOM v6 |
| 数据与状态 | React Query、Zustand（按需） |
| 图表 | ReactECharts |
| 图标 | lucide-react |
| 后端 | Java 17 + Spring Boot 3 + MyBatis-Plus |
| 数据库 | MySQL 8 + Flyway |
| 缓存 | Redis |
| 文件存储 | MinIO（可选，回退本地 `uploads/`） |

前端详细规范见 [`.cursor/rules/frontend.mdc`](./.cursor/rules/frontend.mdc)。

## 快速启动

### 0. 准备环境变量（推荐）

复制根目录 `.env.example` 为 `.env` 并按需修改：

- 后端使用：`HR_DB_URL / HR_DB_USERNAME / HR_DB_PASSWORD`
- 后端端口：`HR_SERVER_PORT`（默认 8087；若端口被占用可改为 8081/18080 等）
- 前端使用：`VITE_API_BASE_URL`

> Windows PowerShell 可直接在终端会话里临时设置，例如：`$env:HR_DB_USERNAME="Eleven"`

### 1. 准备本地 MySQL

确保本机 MySQL 8 已运行。默认配置会在账号有权限时自动创建数据库（`createDatabaseIfNotExist=true`）。若你的账号无建库权限，请手动创建数据库：

```sql
CREATE DATABASE IF NOT EXISTS hr_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

| 项 | 值 |
|---|---|
| 主机 | localhost |
| 端口 | 3306 |
| 数据库 | hr_platform |
| 用户名 | Eleven |
| 密码 | eleven |

### 2. 启动服务

#### 前端（client）

```bash
cd client
npm install
npm run dev
```

访问 [http://localhost:5178/admin/employees/roster](http://localhost:5178/admin/employees/roster)

> 后端 `server/` 尚未初始化时，页面会显示 error 态（禁止 mock，需对接真实 API）。

#### 后端（server）

```bash
cd server
./mvnw spring-boot:run
```

健康检查：

```bash
curl http://localhost:8087/api/v1/health
```

> 如果你修改了 `HR_SERVER_PORT`，请将 `curl` 与 `VITE_API_BASE_URL` 中的端口一并改掉。

## 文档

| 文档 | 说明 |
| --- | --- |
| [完整系统方案](./HR系统完整系统方案.md) | 业务全景与长期蓝图 |
| [产品与技术全面优化方案](./docs/产品与技术全面优化方案.md) | 对照成熟 SaaS 的优化结论 |
| [MVP AI 开发路线图](./docs/MVP-AI开发路线图.md) | 垂直切片任务清单（**开发入口**） |
| [领域模型与表设计（MVP）](./docs/领域模型与表设计-MVP.md) | Entity / API 权威参考 |
| [AGENTS.md](./AGENTS.md) | Cursor Agent 项目指南 |

## Cursor AI 开发

1. 打开 Agent，确认已加载 `AGENTS.md` 与 `.cursor/rules/`
2. 从 [MVP AI 开发路线图](./docs/MVP-AI开发路线图.md) 选择当前 Slice
3. 使用 AGENTS.md 中的 Prompt 模板下发任务

**MVP 前端范围**：仅 `/admin/*`；MSS、ESS 后补。

**当前状态**：阶段 0 — `client/` 已初始化（React + shadcn）；`server/` 待初始化（Slice 0.1）。
