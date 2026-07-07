import { createPortal } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

import { ArchiveFormDialog } from "@/components/admin/employee-archive/ArchiveFormDialog";
import { useArchiveDialogMount } from "@/components/admin/employee-archive/archive-dialog-mount";

type ArchiveFormDialogPortalProps = ComponentProps<typeof ArchiveFormDialog> & {
  children: ReactNode;
};

/** 将档案编辑弹窗挂载到 Sheet 外部，确保遮罩层正常显示 */
export function ArchiveFormDialogPortal(props: ArchiveFormDialogPortalProps) {
  const mountRef = useArchiveDialogMount();
  const mountNode = mountRef?.current;

  if (!mountNode) {
    return <ArchiveFormDialog {...props} />;
  }

  return createPortal(<ArchiveFormDialog {...props} />, mountNode);
}
