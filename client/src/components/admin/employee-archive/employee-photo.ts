import type { EmployeeAttachment } from "@shared/api.interface";

export const EMPLOYEE_PHOTO_ATTACHMENT_TYPE = "PHOTO";

/** 取最新上传的员工照片附件，作为头像来源 */
export function pickLatestEmployeePhoto(
  attachments: EmployeeAttachment[],
): EmployeeAttachment | null {
  const photos = attachments.filter(
    (item) => item.attachmentType === EMPLOYEE_PHOTO_ATTACHMENT_TYPE,
  );
  if (photos.length === 0) return null;

  return [...photos].sort((a, b) => {
    const left = a.uploadedAt ?? a.createdAt ?? "";
    const right = b.uploadedAt ?? b.createdAt ?? "";
    return right.localeCompare(left);
  })[0];
}
