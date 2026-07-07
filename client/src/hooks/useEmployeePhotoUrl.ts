import type { EmployeeAttachment } from "@shared/api.interface";
import { useEffect, useState } from "react";

import { downloadEmployeeAttachment } from "@/api/employee-archive";

/** 将员工照片附件下载为可展示的 blob URL；附件变更时自动刷新 */
export function useEmployeePhotoUrl(
  employeeId: string | undefined,
  photo: EmployeeAttachment | null,
) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employeeId || !photo?.id) {
      setUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    void downloadEmployeeAttachment(employeeId, photo.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [employeeId, photo?.id]);

  return { url, loading };
}
