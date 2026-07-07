import { createContext, useContext, type RefObject, type ReactNode } from "react";

/** Sheet 抽屉之外的弹窗挂载点，避免 base-ui 嵌套 Dialog 导致遮罩不显示 */
export const ArchiveDialogMountContext = createContext<RefObject<HTMLDivElement | null> | null>(
  null,
);

export function ArchiveDialogMountProvider({
  mountRef,
  children,
}: {
  mountRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <ArchiveDialogMountContext.Provider value={mountRef}>
      {children}
    </ArchiveDialogMountContext.Provider>
  );
}

export function useArchiveDialogMount() {
  return useContext(ArchiveDialogMountContext);
}
