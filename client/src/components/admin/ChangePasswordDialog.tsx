import { useState } from "react";
import { toast } from "sonner";

import { changePassword } from "@/api/auth";
import type { ApiError } from "@/api/http";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ChangePasswordDialog({
  open,
  onOpenChange,
  required = false,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 强制改密时不可关闭 */
  required?: boolean;
  onSuccess?: () => void | Promise<void>;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (newPassword.length < 8) {
      toast.error("新密码至少 8 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    try {
      setLoading(true);
      await changePassword({ oldPassword, newPassword });
      toast.success("密码已修改");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
      await onSuccess?.();
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(typeof err?.message === "string" ? err.message : "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (required && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!required} className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{required ? "请先修改密码" : "修改密码"}</DialogTitle>
          <DialogDescription>
            {required
              ? "管理员已重置您的密码，或账号要求首次登录修改密码后才能继续使用。"
              : "修改当前登录账号的密码。"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <FormField label="原密码" required>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </FormField>
          <FormField label="新密码" required hint="至少 8 位，且不能与登录名相同">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormField>
          <FormField label="确认新密码" required>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2">
          {required ? null : (
            <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
              取消
            </Button>
          )}
          <Button disabled={loading} onClick={() => void submit()}>
            {loading ? "提交中…" : "确认修改"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
