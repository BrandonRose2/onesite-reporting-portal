import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { Building2, CalendarRange, ClipboardCheck, FileOutput, LayoutDashboard, LogOut, PanelLeft, Settings2, ShieldCheck, type LucideIcon } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { PortalAtmosphere } from "./PortalAtmosphere";
import { Button } from "./ui/button";

type NavigationItem = { icon: LucideIcon; label: string; path: string; adminOnly?: boolean; managerAllowed?: boolean };
type NavigationGroup = { label: string; items: NavigationItem[] };

const navigationGroups: NavigationGroup[] = [
  {
    label: "Report workspace",
    items: [
      { icon: LayoutDashboard, label: "Home", path: "/" },
      { icon: FileOutput, label: "Run a report", path: "/onesite-reports" },
      { icon: CalendarRange, label: "Property Reports Library", path: "/history" },
      { icon: ClipboardCheck, label: "Manager Checklists", path: "/manager-checklists", managerAllowed: true },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { icon: Building2, label: "Properties", path: "/properties" },
    ],
  },
  {
    label: "Administration",
    items: [
      { icon: Settings2, label: "Manage Reports", path: "/report-catalog", adminOnly: true },
      { icon: ShieldCheck, label: "Portal Access", path: "/access", adminOnly: true },
    ],
  },
];

const menuItems = navigationGroups.flatMap(group => group.items);

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user, logout } = useAuth();
  const portalAccessQuery = trpc.auth.portalAccess.useQuery(undefined, { enabled: Boolean(user) });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (portalAccessQuery.isLoading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!portalAccessQuery.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f8fb] p-5">
        <section className="w-full max-w-xl rounded-[1.75rem] border border-[#d9e8e6] bg-white p-7 shadow-[0_22px_70px_rgba(16,37,63,0.12)] sm:p-10">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf5f3] text-[#0c7469]">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.17em] text-[#0c7469]">Access approval required</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#122b4b]">Your account is awaiting portal approval</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">Ask a portal administrator to approve <strong>{user.email ?? "this Manus account"}</strong> as a boss or assign your manager property access. You will not receive RealPage credentials or access to the live Microsoft Edge session.</p>
          <Button onClick={logout} variant="outline" className="mt-7 border-[#0c7469] text-[#0c7469] hover:bg-[#eaf5f3]">Sign out</Button>
        </section>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent accessRole={portalAccessQuery.data.role} setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  accessRole: "administrator" | "boss" | "manager";
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  accessRole,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const managerNeedsRedirect = accessRole === "manager" && !location.startsWith("/manager-checklists");

  useEffect(() => {
    if (managerNeedsRedirect) setLocation("/manager-checklists");
  }, [managerNeedsRedirect, setLocation]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <PortalAtmosphere />
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-[#122b4b] text-white"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-[5.25rem] justify-center border-b border-[#24466d] px-1">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold tracking-tight text-white">ApartmentCorp</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a9d8d1]"><i className="portal-live-dot" />Property Reports</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {navigationGroups.map(group => {
              const visibleItems = group.items.filter(item => (!item.adminOnly || user?.role === "admin") && (accessRole !== "manager" || item.managerAllowed));
              if (!visibleItems.length) return null;
              return <div key={group.label} className="px-2 pb-2 pt-3 first:pt-2"><p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7fb6c6] group-data-[collapsible=icon]:sr-only">{group.label}</p><SidebarMenu>
              {visibleItems.map(item => {
                const isActive = location === item.path || (item.path === "/manager-checklists" && location.startsWith("/manager-checklists/")) || (item.path === "/onesite-reports" && location.startsWith("/onesite-reports"));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 rounded-lg transition-all font-medium ${isActive ? "bg-[#eaf5f3] text-[#0c7469]" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              </SidebarMenu></div>;
            })}
          </SidebarContent>

          <SidebarFooter className="border-t border-[#24466d] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-white/15 shrink-0">
                    <AvatarFallback className="bg-[#0c7469] text-xs font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-400 truncate">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex h-14 items-center justify-between border-b border-white/50 bg-[#f6f8fb]/72 px-2 shadow-[0_10px_28px_rgba(18,43,75,0.08)] backdrop-blur-xl supports-[backdrop-filter]:backdrop-blur-xl sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="portal-content relative z-10 flex-1 bg-[#f6f8fb]/92 p-4 sm:p-6 lg:p-8">{managerNeedsRedirect ? <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Opening your assigned manager checklists…</div> : children}</main>
      </SidebarInset>
    </>
  );
}
