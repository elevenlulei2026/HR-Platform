import { useState } from "react";
import { Shield } from "lucide-react";

import {
  ContractChangePanel,
  type ContractChangeBootstrap,
} from "@/components/admin/contract-change/ContractChangePanel";
import { ContractExpiringPanel } from "@/components/admin/contract-change/ContractExpiringPanel";
import { NoPermissionCard, PageHeader } from "@/components/admin/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/usePermission";

type ContractTab = "RENEWAL" | "CHANGE" | "EXPIRING";

export function AdminContractsPage() {
  const perm = usePermission();
  const canView = perm.has("contract:view");
  const canEdit = perm.has("contract:edit");
  const [tab, setTab] = useState<ContractTab>("RENEWAL");
  const [renewalBootstrap, setRenewalBootstrap] = useState<ContractChangeBootstrap | null>(null);

  if (!canView) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="合同管理"
          description="合同续签、变更审批与到期提醒。"
        />
        <NoPermissionCard
          icon={<Shield className="size-5 text-muted-foreground" />}
          title="无查看权限"
          description="需要 contract:view 权限。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="合同管理"
        description="办理合同/协议续签与变更审批；到期提醒可一键发起续签。档案详情仍在花名册 Sheet 维护。"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ContractTab)} className="gap-4">
        <TabsList variant="line" className="w-full flex-wrap justify-start">
          <TabsTrigger value="RENEWAL" className="min-w-[88px]">
            续签
          </TabsTrigger>
          <TabsTrigger value="CHANGE" className="min-w-[88px]">
            变更
          </TabsTrigger>
          <TabsTrigger value="EXPIRING" className="min-w-[88px]">
            即将到期
          </TabsTrigger>
        </TabsList>

        <TabsContent value="RENEWAL" className="mt-0 outline-none">
          <ContractChangePanel
            requestType="RENEWAL"
            canEdit={canEdit}
            bootstrap={renewalBootstrap}
            onBootstrapConsumed={() => setRenewalBootstrap(null)}
          />
        </TabsContent>
        <TabsContent value="CHANGE" className="mt-0 outline-none">
          <ContractChangePanel requestType="CHANGE" canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="EXPIRING" className="mt-0 outline-none">
          <ContractExpiringPanel
            canEdit={canEdit}
            onStartRenewal={(bootstrap) => {
              setRenewalBootstrap(bootstrap);
              setTab("RENEWAL");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
