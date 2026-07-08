import type { ReactNode } from "react";
import { FilePenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ArchiveFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  saving?: boolean;
  onSave: () => void;
  saveLabel?: string;
  /** 宽表单（任职等） */
  wide?: boolean;
  /** 更宽表单（花名册主档编辑，约为 wide 的 150%） */
  extraWide?: boolean;
};

/** 档案子模块新建/编辑：在详情抽屉之上居中弹窗 */
export function ArchiveFormDialog({
  open,
  onOpenChange,
  title,
  description = "保存后立即写入员工档案",
  children,
  saving,
  onSave,
  saveLabel = "保存",
  wide,
  extraWide,
}: ArchiveFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        elevated
        showCloseButton={!saving}
        className={cn(
          "flex max-h-[min(88vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          wide && !extraWide && "sm:max-w-2xl",
          // extraWide ≈ 比 wide 再大约 20%，用于任职等信息密集表单
          extraWide && "sm:max-w-[min(1200px,calc(100vw-2rem))]",
        )}
      >
        <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-muted/30 via-background to-muted/20 px-6 py-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
              <FilePenLine className="size-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-muted/10 px-6 py-5">
          {children}
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/25 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={saving} onClick={onSave}>
            {saving ? "保存中…" : saveLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
