import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Database, Moon, Sun } from "lucide-react";

import { getNavMenuTree } from "@/api/menu";
import { useAuth } from "@/auth/AuthProvider";
import { AdminMegaMenuPanel } from "@/components/admin/AdminMegaMenuPanel";
import { ChangePasswordDialog } from "@/components/admin/ChangePasswordDialog";
import { UserMenu } from "@/components/admin/UserMenu";
import {
  adminTopNav,
  getAdminBreadcrumb,
  type AdminNavTopItem,
} from "@/config/admin-nav";
import {
  canSeeAdminNavLink,
  flattenDynamicNavLinks,
  getDynamicBreadcrumb,
  sysMenusToAdminTopNav,
} from "@/config/dynamic-admin-nav";
import { ARCHIVE_DATA_RESOURCES } from "@/config/archive-data-resources";
import {
  ARCHIVE_SECTION_LABELS,
  archiveSectionPermission,
} from "@/config/archive-permissions";
import { ADMIN_NAV_CHANGED_EVENT } from "@/lib/admin-nav-events";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { AppLogoMark } from "@/components/AppLogoMark";
import { APP_NAME } from "@/config/app";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePermission } from "@/hooks/usePermission";

function HrLogo() {
  return (
    <div className="flex items-center gap-2">
      <AppLogoMark className="h-9 w-9" />
      <div className="hidden sm:block">
        <div className="text-sm font-semibold leading-tight text-foreground">{APP_NAME}</div>
        <div className="text-xs text-muted-foreground">HR Platform</div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const perm = usePermission();
  const { user, refreshMe } = useAuth();

  const [cmdOpen, setCmdOpen] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const [topNav, setTopNav] = useState<AdminNavTopItem[]>(adminTopNav);
  const mustChangePassword = Boolean(user?.mustChangePassword);

  const breadcrumb = useMemo(() => {
    const dynamic = getDynamicBreadcrumb(location.pathname, topNav);
    if (dynamic.length > 0) return dynamic;
    return getAdminBreadcrumb(location.pathname);
  }, [location.pathname, topNav]);

  const pageTitle = breadcrumb[breadcrumb.length - 1];
  useDocumentTitle(pageTitle === "未定义页面" ? undefined : pageTitle);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const reloadTopNav = useCallback(() => {
    void getNavMenuTree()
      .then((res) => {
        const converted = sysMenusToAdminTopNav(res.data);
        if (converted.length > 0) setTopNav(converted);
      })
      .catch(() => {
        // 保留静态 admin-nav 作为 fallback
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getNavMenuTree()
      .then((res) => {
        if (cancelled) return;
        const converted = sysMenusToAdminTopNav(res.data);
        if (converted.length > 0) setTopNav(converted);
      })
      .catch(() => {
        // 保留静态 admin-nav 作为 fallback
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onNavChanged = () => reloadTopNav();
    window.addEventListener(ADMIN_NAV_CHANGED_EVENT, onNavChanged);
    return () => window.removeEventListener(ADMIN_NAV_CHANGED_EVENT, onNavChanged);
  }, [reloadTopNav]);

  const isDark = resolvedTheme === "dark";

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  const allLinks = useMemo(() => flattenDynamicNavLinks(topNav), [topNav]);

  const visibleTopNav = useMemo(() => {
    return topNav
      .map((item) => {
        if (item.type === "link") {
          return perm.has(item.permission) ? item : null;
        }
        const columns = item.columns
          .map((col) => {
            const links = col.links.filter((link) =>
              canSeeAdminNavLink(link, perm.has, perm.hasAny),
            );
            if (links.length === 0) return null;
            return { ...col, links, sections: undefined };
          })
          .filter((col): col is NonNullable<typeof col> => col != null);
        if (columns.length === 0) return null;
        return { ...item, columns };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [perm, topNav]);

  const archiveCommandLinks = useMemo(() => {
    return ARCHIVE_DATA_RESOURCES.filter((r) =>
      perm.has(archiveSectionPermission(r.section, "view")),
    );
  }, [perm]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") setCmdOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4">
          <button
            type="button"
            className="relative z-10 flex items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-accent"
            onClick={() => navigate("/admin/dev/health")}
          >
            <HrLogo />
          </button>

          <div className="flex-1" />

          <div className="relative flex shrink-0 items-center gap-2">
            <NavigationMenu>
              <NavigationMenuList className="hidden lg:flex">
                {visibleTopNav.map((item) => {
                  if (item.type === "link") {
                    const active = location.pathname === item.to;
                    return (
                      <NavigationMenuItem key={item.title}>
                        <NavigationMenuLink
                          className={cn(
                            "px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
                            active && "bg-accent text-accent-foreground",
                          )}
                          href={item.to}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.to);
                          }}
                        >
                          {item.title}
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    );
                  }
                  const active = item.columns.some((column) =>
                    column.links.some(
                      (link) =>
                        location.pathname === link.to ||
                        location.pathname.startsWith(`${link.to}/`),
                    ),
                  );
                  return (
                    <NavigationMenuItem key={item.title}>
                      <NavigationMenuTrigger
                        className={cn(
                          "text-sm",
                          active && "bg-primary/[0.08] text-primary",
                        )}
                      >
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <AdminMegaMenuPanel
                          columns={item.columns}
                          pathname={location.pathname}
                          onNavigate={navigate}
                        />
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label={isDark ? "切换为浅色模式" : "切换为深色模式"}
              onClick={toggleTheme}
            >
              {themeMounted ? (
                isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <Sun className="h-4 w-4 opacity-0" />
              )}
            </Button>

            <UserMenu />
          </div>
        </div>
      </header>

      <div className="border-b bg-background">
        <div className="mx-auto max-w-[1440px] px-4 py-2">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumb.map((b, idx) => {
                const isLast = idx === breadcrumb.length - 1;
                return (
                  <BreadcrumbItem key={`${b}-${idx}`}>
                    {isLast ? (
                      <BreadcrumbPage className="font-semibold">{b}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink className="text-muted-foreground">
                        {b}
                      </BreadcrumbLink>
                    )}
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-6">
        <Outlet />
      </main>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="搜索菜单或执行操作…" />
        <CommandList>
          <CommandEmpty>没有找到匹配项</CommandEmpty>
          <CommandGroup heading="快捷操作">
            <CommandItem
              onSelect={() => {
                setCmdOpen(false);
                navigate("/admin/dev/health");
              }}
            >
              健康检查
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="外观">
            <CommandItem onSelect={() => setTheme("light")}>切换：浅色</CommandItem>
            <CommandItem onSelect={() => setTheme("dark")}>切换：深色</CommandItem>
            <CommandItem onSelect={() => setTheme("system")}>切换：跟随系统</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="菜单">
            {allLinks.map((link) => {
              const allowed = canSeeAdminNavLink(link, perm.has, perm.hasAny);
              return (
                <CommandItem
                  key={link.to}
                  disabled={!allowed}
                  onSelect={() => {
                    if (!allowed) return;
                    setCmdOpen(false);
                    navigate(link.to);
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <link.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{link.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{link.group}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
          {archiveCommandLinks.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="管理数据">
                {archiveCommandLinks.map((res) => (
                  <CommandItem
                    key={res.path}
                    onSelect={() => {
                      setCmdOpen(false);
                      navigate(`/admin/employees/data/${res.path}`);
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {res.title}
                          {!res.supported ? (
                            <span className="ml-2 text-xs text-muted-foreground">建设中</span>
                          ) : null}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ARCHIVE_SECTION_LABELS[res.section]}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>

      <ChangePasswordDialog
        open={mustChangePassword}
        onOpenChange={() => {
          /* 强制改密不可关闭 */
        }}
        required
        onSuccess={() => void refreshMe()}
      />
    </div>
  );
}
