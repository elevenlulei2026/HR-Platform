import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { getNavMenuTree } from "@/api/menu";
import { UserMenu } from "@/components/admin/UserMenu";
import {
  adminTopNav,
  getAdminBreadcrumb,
  type AdminNavTopItem,
} from "@/config/admin-nav";
import {
  flattenDynamicNavLinks,
  getDynamicBreadcrumb,
  sysMenusToAdminTopNav,
} from "@/config/dynamic-admin-nav";
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

  const [cmdOpen, setCmdOpen] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const [topNav, setTopNav] = useState<AdminNavTopItem[]>(adminTopNav);

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
            const links = col.links.filter((link) => perm.has(link.permission));
            const sections = col.sections
              ?.map((sec) => ({
                ...sec,
                links: sec.links.filter((link) => perm.has(link.permission)),
              }))
              .filter((sec) => sec.links.length > 0);
            if (links.length === 0 && (!sections || sections.length === 0)) return null;
            return { ...col, links, sections };
          })
          .filter((col): col is NonNullable<typeof col> => col != null);
        if (columns.length === 0) return null;
        return { ...item, columns };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [perm, topNav]);

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
                  return (
                    <NavigationMenuItem key={item.title}>
                      <NavigationMenuTrigger className="text-sm">
                        {item.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div
                          className={cn(
                            "grid gap-4 p-4",
                            item.columns.length <= 3
                              ? "w-[720px] grid-cols-3"
                              : item.columns.length === 4
                                ? "w-[880px] grid-cols-4"
                                : "w-[960px] grid-cols-4",
                          )}
                        >
                          {item.columns.map((col) => (
                            <div key={col.title} className="space-y-2">
                              <div className="text-xs font-semibold text-foreground">
                                {col.title}
                              </div>
                              {col.sections && col.sections.length > 0 ? (
                                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                  {col.sections.map((sec) => (
                                    <div key={sec.title} className="space-y-1">
                                      <div className="px-3 text-[11px] font-medium text-muted-foreground">
                                        {sec.title}
                                      </div>
                                      <div className="space-y-1">
                                        {sec.links.map((link) => (
                                          <a
                                            key={link.to}
                                            href={link.to}
                                            className="block rounded-lg px-3 py-2 text-sm hover:bg-accent"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              navigate(link.to);
                                            }}
                                          >
                                            <div className="font-medium">{link.title}</div>
                                            {link.description ? (
                                              <div className="text-xs text-muted-foreground line-clamp-2">
                                                {link.description}
                                              </div>
                                            ) : null}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {col.links.map((link) => (
                                    <a
                                      key={link.to}
                                      href={link.to}
                                      className="block rounded-lg px-3 py-2 text-sm hover:bg-accent"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigate(link.to);
                                      }}
                                    >
                                      <div className="font-medium">{link.title}</div>
                                      {link.description ? (
                                        <div className="text-xs text-muted-foreground line-clamp-2">
                                          {link.description}
                                        </div>
                                      ) : null}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
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
            {allLinks.map((link) => (
              <CommandItem
                key={link.to}
                disabled={!perm.has(link.permission)}
                onSelect={() => {
                  if (!perm.has(link.permission)) return;
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
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
