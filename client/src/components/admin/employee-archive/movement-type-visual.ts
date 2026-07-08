import type { MovementType } from "@shared/api.interface";
import {
  ArrowLeftRight,
  ArrowUpCircle,
  Banknote,
  Briefcase,
  CircleDot,
  LogIn,
  LogOut,
  RefreshCw,
  Shuffle,
  TrendingDown,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MovementVisualMeta = {
  code: MovementType;
  phase: "hire" | "change" | "leave";
  phaseLabel: string;
  icon: LucideIcon;
  accent: string;
  dot: string;
  ring: string;
  wash: string;
};

/** 异动类型视觉样式（label 以 API / 异动记录冗余字段为准） */
export const MOVEMENT_TYPE_VISUALS: MovementVisualMeta[] = [
  {
    code: "HIR",
    phase: "hire",
    phaseLabel: "入职",
    icon: LogIn,
    accent: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/25",
    wash: "from-emerald-500/[0.07]",
  },
  {
    code: "REH",
    phase: "hire",
    phaseLabel: "入职",
    icon: RefreshCw,
    accent: "text-teal-600 dark:text-teal-400",
    dot: "bg-teal-500",
    ring: "ring-teal-500/25",
    wash: "from-teal-500/[0.07]",
  },
  {
    code: "PRC",
    phase: "change",
    phaseLabel: "在职",
    icon: UserCheck,
    accent: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    ring: "ring-sky-500/25",
    wash: "from-sky-500/[0.07]",
  },
  {
    code: "SPR",
    phase: "change",
    phaseLabel: "在职",
    icon: Shuffle,
    accent: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
    ring: "ring-violet-500/25",
    wash: "from-violet-500/[0.07]",
  },
  {
    code: "PRO",
    phase: "change",
    phaseLabel: "在职",
    icon: ArrowUpCircle,
    accent: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    ring: "ring-amber-500/25",
    wash: "from-amber-500/[0.07]",
  },
  {
    code: "DEM",
    phase: "change",
    phaseLabel: "在职",
    icon: TrendingDown,
    accent: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    ring: "ring-orange-500/25",
    wash: "from-orange-500/[0.07]",
  },
  {
    code: "DTA",
    phase: "change",
    phaseLabel: "在职",
    icon: CircleDot,
    accent: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-500",
    ring: "ring-slate-500/25",
    wash: "from-slate-500/[0.07]",
  },
  {
    code: "XFR",
    phase: "change",
    phaseLabel: "在职",
    icon: ArrowLeftRight,
    accent: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    ring: "ring-blue-500/25",
    wash: "from-blue-500/[0.07]",
  },
  {
    code: "PAY",
    phase: "change",
    phaseLabel: "在职",
    icon: Banknote,
    accent: "text-yellow-700 dark:text-yellow-400",
    dot: "bg-yellow-500",
    ring: "ring-yellow-500/25",
    wash: "from-yellow-500/[0.07]",
  },
  {
    code: "TER",
    phase: "leave",
    phaseLabel: "离职",
    icon: LogOut,
    accent: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    ring: "ring-rose-500/25",
    wash: "from-rose-500/[0.07]",
  },
];

export const MOVEMENT_VISUAL_MAP = Object.fromEntries(
  MOVEMENT_TYPE_VISUALS.map((item) => [item.code, item]),
) as Record<MovementType, MovementVisualMeta>;

export function visualForMovement(
  movementType: string,
  movementTypeName: string,
): MovementVisualMeta & { label: string } {
  const visual = MOVEMENT_VISUAL_MAP[movementType as MovementType];
  if (visual) return { ...visual, label: movementTypeName || movementType };
  return {
    code: movementType as MovementType,
    label: movementTypeName || movementType,
    phase: "change",
    phaseLabel: "在职",
    icon: Briefcase,
    accent: "text-primary",
    dot: "bg-primary",
    ring: "ring-primary/25",
    wash: "from-primary/[0.07]",
  };
}
