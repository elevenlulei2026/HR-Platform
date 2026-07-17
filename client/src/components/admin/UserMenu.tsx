import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, KeyRound, LogOut } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";
import { ChangePasswordDialog } from "@/components/admin/ChangePasswordDialog";
import { Button } from "@/components/ui/button";
import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const navigate = useNavigate();
  const { user, logout, refreshMe } = useAuth();
  const [open, setOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, closeMenu, open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMenu, open]);

  function handleLogout() {
    closeMenu();
    logout();
    navigate("/login", { replace: true });
  }

  const label = user?.displayName || user?.username || "未登录";

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-[200] min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {user?.username ? `登录名：${user.username}` : "未登录"}
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
            onClick={() => {
              closeMenu();
              setPwdOpen(true);
            }}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            修改密码
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 dark:hover:bg-destructive/15"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            退出登录
          </button>
        </div>
      ) : null}

      <ChangePasswordDialog
        open={pwdOpen}
        onOpenChange={setPwdOpen}
        onSuccess={() => void refreshMe()}
      />
    </div>
  );
}
