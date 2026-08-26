import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, Clock3, FileBarChart, FolderOpen, ShieldAlert, UsersRound } from "lucide-react";
import { useLocation } from "wouter";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

const actionCards = [
  { title: "Request a report", description: "Search approved OneSite reports, configure settings, and queue every active property or one selected site.", tone: "text-[#0b8775] bg-[#dff6ef]", icon: FileBarChart, path: "/request/onesite" },
  { title: "Review property reporting", description: "Navigate current reporting activity, archived output, warnings, and property-level filing context.", tone: "text-[#173c70] bg-[#e8effb]", icon: FolderOpen, path: "/library" },
  { title: "Manager follow-up", description: "Open property context with manager information and clearly separated follow-up work.", tone: "text-[#8a5a05] bg-[#fff1cf]", icon: UsersRound, path: "/manager-checklists" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.dashboard.overview.useQuery();
  const statusCounts = data?.statusCounts ?? {};

  return <DashboardLayout>
    <PageHeader eyebrow="Home" title="AptCorp Property Reports" description="Request, file, review, and follow up on property reporting in one secure workspace." />

    <section className="overflow-hidden rounded-[24px] bg-[linear-gradient(112deg,#0e3d4b_0%,#102b50_58%,#26385d_100%)] px-6 py-7 text-white shadow-[0_22px_50px_-30px_rgba(15,38,72,.9)] sm:px-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-200">ApartmentCorp</p>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-semibold tracking-[-0.025em] sm:text-[28px]">A clear operational view of every report.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">OneSite Reporting Hub connects your authorized report requests, document filing, and operational history—without placing sensitive credentials in the portal.</p></div><div className="flex gap-3"><div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-300">Active properties</p><p className="mt-1 text-xl font-semibold">{isLoading ? "—" : data?.activeProperties ?? 0}</p></div><div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-300">Approved reports</p><p className="mt-1 text-xl font-semibold">{isLoading ? "—" : data?.activeCatalogEntries ?? 0}</p></div></div></div>
    </section>

    <section className="mt-8"><div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">How to use</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Choose your next reporting action</h2></div><div className="grid gap-3 xl:grid-cols-3">{actionCards.map(card => <button key={card.title} onClick={() => setLocation(card.path)} className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_12px_28px_-22px_rgba(15,35,67,.55)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_35px_-22px_rgba(15,35,67,.48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b8775]"><span className={`grid h-10 w-10 place-items-center rounded-xl ${card.tone}`}><card.icon className="h-4 w-4" /></span><div className="mt-5 flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-950">{card.title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">{card.description}</p></div><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" /></div></button>)}</div></section>

    <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.8fr)]">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">Quick look</p><h2 className="mt-1 text-base font-semibold text-slate-950">Previously requested reports</h2></div><Button variant="ghost" size="sm" onClick={() => setLocation("/library")} className="text-xs text-[#087365] hover:bg-[#ecfaf6] hover:text-[#087365]">View all reports <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></div>
        <div className="divide-y divide-slate-100">{isLoading ? <div className="px-5 py-8 text-sm text-slate-500">Loading request history…</div> : data?.recentRequests?.length ? data.recentRequests.map(request => <button key={request.id} onClick={() => setLocation("/library")} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ecfaf6] text-[#087365]"><FileBarChart className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{request.requestedReportName}</span><span className="mt-0.5 block text-xs text-slate-500">Requested {formatDate(request.createdAt)}</span></span><StatusBadge status={request.status} /></button>) : <div className="px-5 py-9"><p className="text-sm font-semibold text-slate-800">No report requests yet</p><p className="mt-1 text-xs leading-5 text-slate-500">Create a request after you import properties and synchronize the approved report catalog.</p></div>}</div>
      </div>
      <div className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">Operational queue</p><h2 className="mt-1 text-base font-semibold text-slate-950">Last 30 days</h2></div><Clock3 className="h-4 w-4 text-slate-400" /></div><div className="mt-5 grid grid-cols-2 gap-2"><Metric label="Queued" value={statusCounts.queued ?? 0} /><Metric label="In progress" value={(statusCounts.claimed ?? 0) + (statusCounts.in_progress ?? 0)} /><Metric label="Completed" value={statusCounts.completed ?? 0} tone="text-emerald-700" /><Metric label="Needs review" value={(statusCounts.completed_with_warnings ?? 0) + (statusCounts.failed ?? 0)} tone="text-amber-700" /></div></div>
        <div className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-5"><div className="flex gap-3"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><p className="text-sm font-semibold text-amber-950">Known limitation</p><p className="mt-1 text-xs leading-5 text-amber-900/80">My Reports discovery is intentionally unverified. The runner will record a warning instead of silently treating discovered output as downloaded.</p></div></div></div>
      </div>
    </section>
  </DashboardLayout>;
}

function Metric({ label, value, tone = "text-slate-950" }: { label: string; value: number; tone?: string }) { return <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p><p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p></div>; }
