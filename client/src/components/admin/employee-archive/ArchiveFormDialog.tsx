import type { ReactNode } from "react";

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
  wide,
  extraWide,
}: ArchiveFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "z-[70] flex max-h-[min(88vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          wide && !extraWide && "sm:max-w-2xl",
          extraWide && "sm:max-w-[min(1008px,calc(100vw-2rem))]",
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12 text-left">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={saving} onClick={onSave}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
