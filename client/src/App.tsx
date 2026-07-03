import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "@/auth/RequireAuth";
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
import { AdminWorkflowPage } from "@/pages/admin/platform/AdminWorkflowPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

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
        <Route path="dashboard" element={<AdminPlaceholderPage title="工作台" />} />
        <Route path="reports" element={<AdminPlaceholderPage title="报表概览" />} />
        <Route path="settings" element={<AdminSettingsPage />} />

        <Route path="org/structure" element={<AdminOrgStructurePage />} />
        <Route path="org/positions" element={<AdminOrgPositionsPage />} />
        <Route path="org/headcount" element={<AdminOrgHeadcountPage />} />

        <Route path="employees/roster" element={<AdminPlaceholderPage title="员工花名册" />} />
        <Route
          path="employees/reporting-lines"
          element={<AdminPlaceholderPage title="汇报关系" />}
        />

        <Route path="onboarding" element={<AdminPlaceholderPage title="入职办理" />} />
        <Route path="movements" element={<AdminPlaceholderPage title="人事异动" />} />
        <Route path="offboarding" element={<AdminPlaceholderPage title="离职办理" />} />
        <Route path="contracts" element={<AdminPlaceholderPage title="合同管理" />} />

        <Route path="platform/workflow" element={<AdminWorkflowPage />} />
        <Route path="platform/tasks" element={<AdminTasksPage />} />
        <Route
          path="platform/permissions"
          element={<AdminPermissionsPage />}
        />
        <Route path="platform/audit" element={<AdminAuditLogsPage />} />

        <Route path="dev/health" element={<AdminDevHealthPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
