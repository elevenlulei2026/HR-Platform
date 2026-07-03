import { Badge } from "@/components/ui/badge";

export function AdminPlaceholderPage(props: { title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            该页面按垂直切片逐步实现。当前仅提供导航骨架与三态示例页面（健康检查）。
          </p>
        </div>
        <Badge variant="secondary">Slice 0 占位</Badge>
      </div>

      <div className="rounded-xl border border-dashed bg-muted/30 p-6">
        <div className="text-sm text-muted-foreground">
          验收要点（后续切片将逐条落地）：
        </div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground/90">
          <li>契约优先：先更新 `shared/api.interface.ts`，再写后端与前端。</li>
          <li>后端强制鉴权：写接口与功能接口必须鉴权（Slice 1/3）。</li>
          <li>三态：loading / error / empty（禁止 mock）。</li>
          <li>列表 + 右侧 Sheet 抽屉详情（主数据页）。</li>
        </ul>
      </div>
    </div>
  );
}

