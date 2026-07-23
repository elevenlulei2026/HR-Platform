/** Admin 统一选中 / 芯片 / 分段控件样式（主色蓝，克制、无硬色条） */

/** 生效版本等可选芯片：默认 */
export const adminChipIdle =
  "border-border/70 bg-background text-foreground transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm";

/** 生效版本等可选芯片：选中 */
export const adminChipActive =
  "border-primary/45 bg-primary/[0.08] text-foreground shadow-[0_1px_3px_hsl(var(--primary)/0.12)] ring-1 ring-primary/15";

/** 顶部一级分段 Tab：默认 */
export const adminSegmentIdle =
  "text-muted-foreground transition-[color,background-color,box-shadow] duration-200 ease-out hover:bg-background/50 hover:text-foreground";

/** 顶部一级分段 Tab：选中 — 抬升胶囊，不用底线 */
export const adminSegmentActive =
  "bg-background text-foreground shadow-[0_1px_3px_hsl(var(--foreground)/0.06)] ring-1 ring-border/50";

/** 二级锚点 / 小标签：默认 */
export const adminPillIdle =
  "text-muted-foreground transition-[color,background-color] duration-200 hover:bg-muted/70 hover:text-foreground";

/** 二级锚点 / 小标签：选中 — 柔和胶囊 */
export const adminPillActive =
  "bg-primary/10 text-primary font-semibold shadow-[0_1px_2px_hsl(var(--primary)/0.08)] ring-1 ring-primary/15";

/** 列表行 / 树节点选中 */
export const adminRowSelected =
  "border-primary/35 bg-primary/[0.06]";

/** 卡片入场（配合 motion-safe） */
export const adminCardEnter =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300";
