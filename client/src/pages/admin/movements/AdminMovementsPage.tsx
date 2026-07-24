import { useState } from "react";
import { Shield } from "lucide-react";

import { JobMovementPanel } from "@/components/admin/job-movement/JobMovementPanel";
import { RegularizationPanel } from "@/components/admin/regularization/RegularizationPanel";
import { NoPermissionCard, PageHeader } from "@/components/admin/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/usePermission";

type MovementTab = "PRC" | "PRO" | "DEM" | "SPR";

export function AdminMovementsPage() {
  const perm = usePermission();
  const canView = perm.has("employee:movement:view");
  const canEdit = perm.has("employee:movement:edit");
  const [tab, setTab] = useState<MovementTab>("PRC");

  if (!canView) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="人事异动"
          description="办理转正、晋升晋级、降职降级、雇佣类型变更等职务异动。"
        />
        <NoPermissionCard
          icon={<Shield className="size-5 text-muted-foreground" />}
          title="无查看权限"
          description="需要 employee:movement:view 权限。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="人事异动"
        description="对齐职务数据三级异动目录：转正 / 晋升晋级 / 降职降级 / 雇佣类型变更。审批通过后写入任职版本与异动记录。"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as MovementTab)} className="gap-4">
        <TabsList variant="line" className="w-full flex-wrap justify-start">
          <TabsTrigger value="PRC" className="min-w-[88px]">
            转正
          </TabsTrigger>
          <TabsTrigger value="PRO" className="min-w-[88px]">
            晋升晋级
          </TabsTrigger>
          <TabsTrigger value="DEM" className="min-w-[88px]">
            降职降级
          </TabsTrigger>
          <TabsTrigger value="SPR" className="min-w-[108px]">
            雇佣类型变更
          </TabsTrigger>
        </TabsList>

        <TabsContent value="PRC" className="mt-0 outline-none">
          <RegularizationPanel canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="PRO" className="mt-0 outline-none">
          <JobMovementPanel movementType="PRO" canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="DEM" className="mt-0 outline-none">
          <JobMovementPanel movementType="DEM" canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="SPR" className="mt-0 outline-none">
          <JobMovementPanel movementType="SPR" canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
