import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Cog,
  LayoutDashboard,
  LifeBuoy,
  Settings2,
  Shield,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  BriefcaseBusiness,
  Settings2,
  ClipboardList,
  ShieldCheck,
  LifeBuoy,
  Shield,
  Workflow,
  BarChart3,
  Cog,
};

export function resolveMenuIcon(name?: string | null): LucideIcon {
  if (!name) return ClipboardList;
  return ICON_MAP[name] ?? ClipboardList;
}
