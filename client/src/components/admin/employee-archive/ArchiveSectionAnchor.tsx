import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ArchiveSectionAnchorProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

/** 档案详情滚动锚点容器 */
export function ArchiveSectionAnchor({ id, children, className }: ArchiveSectionAnchorProps) {
  return (
    <section
      id={`archive-section-${id}`}
      data-archive-section={id}
      className={cn("scroll-mt-[var(--archive-nav-offset,9.5rem)]", className)}
    >
      {children}
    </section>
  );
}
