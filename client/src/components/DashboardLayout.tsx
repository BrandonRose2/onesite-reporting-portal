import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownToLine,
  BarChart3,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  FolderOpen,
  Gauge,
  KeyRound,
  Layers3,
  LibraryBig,
  LogOut,
  PanelLeft,
  Settings2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type NavItem = { icon: typeof Gauge; label: string; path: string };

const navigationGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Pull Reports",
    items: [
      { icon: ArrowDownToLine, label: "Pull Reports – OneSite", path: "/request/onesite" },
      { icon: FileSpreadsheet, label: "Pull Reports – Yardi", path: "/request/yardi" },
    ],
  },
  {
    label: "Review Reports",
    items: [
      { icon: Gauge, label: "Home", path: "/" },
      { icon: FolderOpen, label: "Report Library", path: "/library" },
      { icon: BarChart3, label: "Compare Periods", path: "/compare-periods" },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { icon: Building2, label: "Properties", path: "/properties" },
      { icon: ClipboardCheck, label: "Manager Checklists", path: "/manager-checklists" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: Upload, label: "Import Data", path: "/import-data" },
      { icon: Settings2, label: "Automation Settings", path: "/automation-settings" },
      { icon: KeyRound, label: "Portal Access", path: "/portal-access" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "onesite-sidebar-width";
const DEFAULT_WIDTH = 272;
const MIN_WIDTH = 236;
const MAX_WIDTH = 360;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user } = useAuth();

  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6fb] px-5 text-slate-950">
        <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-9 text-center shadow-[0_24px_80px_-42px_rgba(9,28,53,.45)]">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#0d8b79] text-white"><ShieldCheck className="h-6 w-6" /></div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0d8b79]">ApartmentCorp</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Property Reports</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">This internal workspace is available only to authorized users.</p>
          <Button onClick={() => startLogin()} className="mt-7 w-full bg-[#0d8b79] hover:bg-[#087366]">Sign in securely</Button>
        </section>
      </main>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { data: recovery } = trpc.operations.recoveryStatus.useQuery(undefined, { retry: false });
  const runnerStatuses = recovery?.runners ?? {
    onesite: { status: "unavailable" },
    yardi: { status: "unavailable" },
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = event.clientX - left;
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width);
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-0 bg-[#0c1d35] text-slate-100" disableTransition={isResizing}>
          <SidebarHeader className="px-4 pb-4 pt-5">
            <button onClick={() => setLocation("/")} className="flex w-full items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0d8b79] shadow-[0_8px_20px_-8px_rgba(20,223,190,.75)]"><Layers3 className="h-4 w-4 text-white" /></span>
              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-[13px] font-semibold tracking-[0.02em] text-white">ApartmentCorp</span>
                <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Property Reports</span>
              </span>
            </button>
            <div className="mt-5 rounded-xl bg-white/[0.055] px-3 py-2.5 group-data-[collapsible=icon]:hidden">
              {(["onesite", "yardi"] as const).map(source => {
                const status = runnerStatuses[source]?.status ?? "unavailable";
                return <div key={source} className="flex items-center justify-between gap-2 py-0.5 text-[11px] text-slate-300"><span className="capitalize">{source}</span><span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${status === "ready" ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,.12)]" : status === "interactive_required" ? "bg-amber-400" : "bg-slate-500"}`} />{status === "ready" ? "ready" : status === "interactive_required" ? "sign-in needed" : "offline"}</span></div>;
              })}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 pb-3">
            {navigationGroups.map(group => (
              <section key={group.label} className="mb-4">
                <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 group-data-[collapsible=icon]:hidden">{group.label}</p>
                <SidebarMenu className="gap-0.5">
                  {group.items.map(item => {
                    const active = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton isActive={active} onClick={() => setLocation(item.path)} tooltip={item.label} className={`h-9 rounded-lg px-2.5 text-[12px] font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white data-[active=true]:bg-[#0f514e] data-[active=true]:text-white ${active ? "shadow-[inset_0_0_0_1px_rgba(45,212,191,.14)]" : ""}`}>
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </section>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-white/[0.07] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left outline-none transition-colors hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-teal-300 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-8 w-8 border-0 bg-[#0d8b79]"><AvatarFallback className="bg-[#0d8b79] text-[11px] font-semibold text-white">{user?.name?.slice(0, 1).toUpperCase() || "A"}</AvatarFallback></Avatar>
                  <span className="min-w-0 group-data-[collapsible=icon]:hidden"><span className="block truncate text-[11px] font-semibold text-white">{user?.name || "Authorized user"}</span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{user?.email || "Internal access"}</span></span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div aria-hidden="true" className="absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors hover:bg-teal-400/30" onMouseDown={() => setIsResizing(true)} />
      </div>
      <SidebarInset className="min-w-0 bg-[#f4f6fb]">
        {isMobile ? <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-[#f4f6fb]/95 px-4 backdrop-blur"><SidebarTrigger className="h-8 w-8 rounded-lg bg-white shadow-sm" /><div className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">Property Reports</span><span className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500"><span className="flex items-center gap-1"><i className={`h-1.5 w-1.5 rounded-full ${runnerStatuses.onesite?.status === "ready" ? "bg-emerald-500" : runnerStatuses.onesite?.status === "interactive_required" ? "bg-amber-500" : "bg-slate-400"}`} />OneSite</span><span className="flex items-center gap-1"><i className={`h-1.5 w-1.5 rounded-full ${runnerStatuses.yardi?.status === "ready" ? "bg-emerald-500" : runnerStatuses.yardi?.status === "interactive_required" ? "bg-amber-500" : "bg-slate-400"}`} />Yardi</span></span></div></header> : null}
        <main className="min-h-screen px-5 py-5 lg:px-9 lg:py-8">{children}</main>
      </SidebarInset>
    </>
  );
}
