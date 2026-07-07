import type { EmployeeAttachment } from "@shared/api.interface";
import { useMemo } from "react";
import { UserRound } from "lucide-react";

import { pickLatestEmployeePhoto } from "@/components/admin/employee-archive/employee-photo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEmployeePhotoUrl } from "@/hooks/useEmployeePhotoUrl";
import { cn } from "@/lib/utils";

type EmployeeAvatarProps = {
  employeeId: string;
  fullName: string;
  attachments?: EmployeeAttachment[];
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
};

export function EmployeeAvatar({
  employeeId,
  fullName,
  attachments = [],
  className,
  fallbackClassName,
  imageClassName,
}: EmployeeAvatarProps) {
  const photo = useMemo(() => pickLatestEmployeePhoto(attachments), [attachments]);
  const { url } = useEmployeePhotoUrl(employeeId, photo);
  const initial = fullName.trim().slice(0, 1);

  return (
    <Avatar className={className}>
      {url ? (
        <AvatarImage
          src={url}
          alt={`${fullName}的照片`}
          className={imageClassName}
        />
      ) : null}
      <AvatarFallback className={cn(fallbackClassName)}>
        {initial || <UserRound className="size-5" />}
      </AvatarFallback>
    </Avatar>
  );
}
