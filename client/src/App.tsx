import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "@/auth/RequireAuth";
import { RequirePermission } from "@/auth/RequirePermission";
import { AdminLayout } from "@/layouts/AdminLayout";
import { LoginPage } from "@/pages/LoginPage";
import { AdminPlaceholderPage } from "@/pages/admin/AdminPlaceholderPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminDevHealthPage } from "@/pages/admin/dev/AdminDevHealthPage";
import { AdminAuditLogsPage } from "@/pages/admin/platform/AdminAuditLogsPage";
import { AdminPermissionsPage } from "@/pages/admin/platform/AdminPermissionsPage";
import { AdminTasksPage } from "@/pages/admin/platform/AdminTasksPage";
import { AdminOrgHeadcountPage } from "@/pages/admin/org/AdminOrgHeadcountPage";
import { AdminOrgPositionsPage } from "@/pages/admin/org/AdminOrgPositionsPage";
import { AdminOrgStructurePage } from "@/pages/admin/org/AdminOrgStructurePage";
import { AdminEmployeesRosterPage } from "@/pages/admin/employees/AdminEmployeesRosterPage";
import { AdminReportingLinesPage } from "@/pages/admin/employees/AdminReportingLinesPage";
import { AdminWorkflowPage } from "@/pages/admin/platform/AdminWorkflowPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function Guarded(props: { title?: string; children: React.ReactNode }) {
  return <RequirePermission title={props.title}>{props.children}</RequirePermission>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Guarded title="工作台">
              <AdminPlaceholderPage title="工作台" />
            </Guarded>
          }
        />
        <Route
          path="reports"
          element={
            <Guarded title="报表概览">
              <AdminPlaceholderPage title="报表概览" />
            </Guarded>
          }
        />
        <Route
          path="settings"
          element={
            <Guarded title="系统设置">
              <AdminSettingsPage />
            </Guarded>
          }
        />

        <Route path="org/structure" element={<Guarded title="组织架构"><AdminOrgStructurePage /></Guarded>} />
        <Route path="org/positions" element={<Guarded title="岗位体系"><AdminOrgPositionsPage /></Guarded>} />
        <Route path="org/headcount" element={<Guarded title="编制管理"><AdminOrgHeadcountPage /></Guarded>} />

        <Route path="employees/roster" element={<Guarded title="员工花名册"><AdminEmployeesRosterPage /></Guarded>} />
        <Route path="employees/reporting-lines" element={<Guarded title="汇报关系"><AdminReportingLinesPage /></Guarded>} />

        <Route
          path="onboarding"
          element={
            <Guarded title="入职办理">
              <AdminPlaceholderPage title="入职办理" />
            </Guarded>
          }
        />
        <Route
          path="movements"
          element={
            <Guarded title="人事异动">
              <AdminPlaceholderPage title="人事异动" />
            </Guarded>
          }
        />
        <Route
          path="offboarding"
          element={
            <Guarded title="离职办理">
              <AdminPlaceholderPage title="离职办理" />
            </Guarded>
          }
        />
        <Route
          path="contracts"
          element={
            <Guarded title="合同管理">
              <AdminPlaceholderPage title="合同管理" />
            </Guarded>
          }
        />

        <Route path="platform/workflow" element={<Guarded title="流程配置"><AdminWorkflowPage /></Guarded>} />
        <Route path="platform/tasks" element={<Guarded title="待办中心"><AdminTasksPage /></Guarded>} />
        <Route path="platform/permissions" element={<Guarded title="RBAC 权限"><AdminPermissionsPage /></Guarded>} />
        <Route path="platform/audit" element={<Guarded title="审计日志"><AdminAuditLogsPage /></Guarded>} />

        <Route path="dev/health" element={<Guarded title="健康检查"><AdminDevHealthPage /></Guarded>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
