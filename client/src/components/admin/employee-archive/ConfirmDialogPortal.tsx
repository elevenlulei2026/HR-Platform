import { createPortal } from "react-dom";
import type { ComponentProps } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useArchiveDialogMount } from "@/components/admin/employee-archive/archive-dialog-mount";

type ConfirmDialogPortalProps = ComponentProps<typeof ConfirmDialog>;

/** 将确认弹窗挂载到 Sheet 外部，确保遮罩层正常显示 */
export function ConfirmDialogPortal(props: ConfirmDialogPortalProps) {
  const mountRef = useArchiveDialogMount();
  const mountNode = mountRef?.current;

  if (!mountNode) {
    return <ConfirmDialog {...props} />;
  }

  return createPortal(<ConfirmDialog {...props} />, mountNode);
}
