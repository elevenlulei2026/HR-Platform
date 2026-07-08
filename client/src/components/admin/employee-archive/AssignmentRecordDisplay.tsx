import type { EmployeeAssignment } from "@shared/api.interface";

import {
  ArchiveRecordField,
  ArchiveRecordFieldGrid,
} from "@/components/admin/employee-archive/archive-record-ui";
import { ASSIGNMENT_DISPLAY_SECTIONS } from "@/components/admin/employee-archive/assignment-field-defs";

type AssignmentRecordDisplayProps = {
  assignment: EmployeeAssignment;
};

export function AssignmentRecordDisplay({ assignment }: AssignmentRecordDisplayProps) {
  return (
    <div className="space-y-3">
      {ASSIGNMENT_DISPLAY_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </p>
          <ArchiveRecordFieldGrid>
            {section.fields.map((field) => (
              <ArchiveRecordField
                key={`${section.title}-${field.label}`}
                label={field.label}
                value={field.value(assignment)}
                mono={field.mono}
                highlight={field.highlight}
              />
            ))}
          </ArchiveRecordFieldGrid>
        </div>
      ))}
    </div>
  );
}
