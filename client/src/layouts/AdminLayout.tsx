import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { UserMenu } from "@/components/admin/UserMenu";
import { adminTopNav, flattenAdminNavLinks, getAdminBreadcrumb } from "@/config/admin-nav";
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
import { APP_NAME } from "@/config/app";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePermission } from "@/hooks/usePermission";

function HrLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-500 shadow-sm" />
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

  const breadcrumb = useMemo(
    () => getAdminBreadcrumb(location.pathname),
    [location.pathname],
  );

  const pageTitle = breadcrumb[breadcrumb.length - 1];
  useDocumentTitle(pageTitle === "未定义页面" ? undefined : pageTitle);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  const allLinks = useMemo(() => flattenAdminNavLinks(), []);

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
                {adminTopNav.map((item) => {
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
                        <div className="grid w-[720px] grid-cols-3 gap-4 p-4">
                          {item.columns.map((col) => (
                            <div key={col.title} className="space-y-2">
                              <div className="text-xs font-semibold text-foreground">
                                {col.title}
                              </div>
                              <div className="space-y-1">
                                {col.links.map((link) => (
                                  <a
                                    key={link.to}
                                    href={link.to}
                                    className={cn(
                                      "block rounded-lg px-3 py-2 text-sm",
                                      perm.has(link.permission)
                                        ? "hover:bg-accent"
                                        : "opacity-50 cursor-not-allowed",
                                    )}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (!perm.has(link.permission)) return;
                                      navigate(link.to);
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <link.icon className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{link.title}</span>
                                    </div>
                                    {link.description ? (
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {link.description}
                                      </div>
                                    ) : null}
                                  </a>
                                ))}
                              </div>
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
