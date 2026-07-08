import type { EmployeeAssignment, OrganizationTreeNode } from "@shared/api.interface";

import { Badge } from "@/components/ui/badge";
import {
  ArchiveRecordField,
  ArchiveRecordFieldGrid,
} from "@/components/admin/employee-archive/archive-record-ui";
import { getAssignmentDisplaySections } from "@/components/admin/employee-archive/assignment-field-defs";

type AssignmentRecordDisplayProps = {
  assignment: EmployeeAssignment;
  /** 用于渲染“组织路径”的完整组织列表（包含根节点） */
  orgsForPath: OrganizationTreeNode[];
};

function buildOrgPathSegments(orgId: string, nodes: OrganizationTreeNode[]): string[] {
  if (!orgId) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const start = byId.get(orgId);
  if (!start) return [];

  const names: string[] = [];
  const visitedCodes = new Set<string>();
  let cur: OrganizationTreeNode | undefined = start;
  while (cur) {
    if (cur.code && visitedCodes.has(cur.code)) break;
    if (cur.code) visitedCodes.add(cur.code);
    names.push(cur.name);
    const parentCode = cur.parentCode;
    if (!parentCode) break;
    cur = byCode.get(parentCode);
  }
  return names.reverse();
}

function OrgPathBadges({ segments }: { segments: string[] }) {
  if (segments.length === 0) return "—";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {segments.map((seg, idx) => (
        <div key={`${seg}-${idx}`} className="flex items-center gap-1">
          {idx > 0 ? <span className="text-muted-foreground/60">/</span> : null}
          <Badge
            variant={idx === segments.length - 1 ? "default" : "secondary"}
            className="h-5"
          >
            {seg}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function AssignmentRecordDisplay({ assignment, orgsForPath }: AssignmentRecordDisplayProps) {
  const sections = getAssignmentDisplaySections(assignment);
  const orgPathSegments = buildOrgPathSegments(assignment.organizationId, orgsForPath);

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </p>
          <ArchiveRecordFieldGrid>
            {section.fields.flatMap((field) => {
              const out = [
                <ArchiveRecordField
                  key={`${section.title}-${field.label}`}
                  label={field.label}
                  value={field.value(assignment)}
                  mono={field.mono}
                  highlight={field.highlight}
                />,
              ];
              if (section.title === "岗位与组织" && field.label === "部门") {
                out.push(
                  <ArchiveRecordField
                    key={`${section.title}-组织路径`}
                    label="组织路径"
                    value={<OrgPathBadges segments={orgPathSegments} />}
                  />,
                );
              }
              return out;
            })}
          </ArchiveRecordFieldGrid>
        </div>
      ))}
    </div>
  );
}
