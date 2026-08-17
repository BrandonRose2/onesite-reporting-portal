import { Panel } from "@/components/delinquency-ui";
import { ReportingOverviewQuickActions } from "@/components/ReportingOverviewQuickActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Archive, ArrowRight, FileOutput, History } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

function dateLabel(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function portalReportTitle(title: string) {
  return title.replace(/delinquent\s+and\s+prepaid\s*\(excel\)/gi, "Delinquency");
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const requestsQuery = trpc.onesiteReporting.requests.useQuery();
  const documentsQuery = trpc.onesiteReporting.documents.useQuery();
  const quickLookReports = useMemo(() => (requestsQuery.data ?? [])
    .filter(({ request }) => request.status === "completed" || request.status === "completed_with_warnings")
    .slice(0, 4), [requestsQuery.data]);
  const recentDocuments = useMemo(() => (documentsQuery.data ?? []).slice(0, 6), [documentsQuery.data]);
  const isLoading = requestsQuery.isLoading || documentsQuery.isLoading;

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-40 rounded-[1.5rem]" /><Skeleton className="h-36 rounded-[1.25rem]" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44 rounded-[1.25rem]" />)}</div></div>;
  }

  return <div className="mx-auto max-w-6xl space-y-8">
    <section className="portal-hero overflow-hidden rounded-[1.5rem] bg-[#122b4b] px-5 py-7 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:px-7 sm:py-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a9d8d1]">Apartment Corp</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">AptCorp Property Reports</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">Request, file, review, and follow up on property reporting in one secure workspace.</p>
      <div className="portal-marquee mt-6" aria-hidden="true"><div><span>WORKBOOKS FILED</span><span>AUDIT TRAIL</span><span>PROPERTY SCOPE</span><span>REPORT READY</span><span>WORKBOOKS FILED</span><span>AUDIT TRAIL</span><span>PROPERTY SCOPE</span><span>REPORT READY</span></div></div>
    </section>

    <section className="space-y-4">
      <div className="px-1"><p className="portal-section-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#0c7469]">How to use</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#122b4b]">Choose your next reporting action</h2></div>
      <ReportingOverviewQuickActions onNavigate={setLocation} />
    </section>

    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1"><div><p className="portal-section-label text-[11px] font-bold uppercase tracking-[0.16em] text-[#0c7469]">Quick look</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#122b4b]">Previously pulled reports</h2><p className="mt-1 text-sm text-slate-600">Recent completed report runs, including their filing progress and output count.</p></div><Button variant="outline" onClick={() => setLocation("/onesite-reports")} className="border-[#0c7469] text-[#0c7469] hover:bg-[#eaf5f3]"><History className="mr-2 h-4 w-4" />View all reports</Button></div>
      {quickLookReports.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{quickLookReports.map(({ request, catalog }) => <article key={request.id} className="portal-report-card rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(16,37,63,0.06)]"><div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf5f3] text-[#0c7469]"><FileOutput className="h-5 w-5" /></div><Badge variant="outline" className="capitalize">{statusLabel(request.status)}</Badge></div><h3 className="mt-5 line-clamp-2 text-base font-semibold text-[#122b4b]">{portalReportTitle(catalog?.displayName ?? request.requestedReportName)}</h3><p className="mt-2 text-xs text-slate-500">Pulled {dateLabel(request.completedAt ?? request.requestedAt)}</p><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs font-medium text-slate-600">{request.documentCount} filed {request.documentCount === 1 ? "workbook" : "workbooks"}</span><button onClick={() => setLocation("/onesite-reports")} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0c7469] hover:text-[#095e56]">Details <ArrowRight className="h-3.5 w-3.5" /></button></div></article>)}</div> : <Panel eyebrow="Quick look" title="No completed reports yet"><div className="p-7 text-center"><Archive className="mx-auto h-7 w-7 text-[#0c7469]" /><p className="mt-3 text-sm font-semibold text-[#122b4b]">Completed reports will appear here.</p><p className="mt-1 text-xs leading-5 text-slate-600">After a report is pulled and filed, its status and workbook count will be available from this homepage.</p><Button onClick={() => setLocation("/onesite-reports")} className="mt-5 hunter-metal-button"><FileOutput className="mr-2 h-4 w-4" />Open reports</Button></div></Panel>}
    </section>

    <Panel eyebrow="Recent filing activity" title="Latest property workbooks"><div className="divide-y divide-slate-100">{recentDocuments.length ? recentDocuments.map(document => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#122b4b]">{document.propertyName ?? "Portfolio report"}</p><p className="mt-1 text-xs text-slate-500">{document.region ?? "Portfolio"} · filed {dateLabel(document.createdAt)}</p></div><Button variant="outline" size="sm" onClick={() => setLocation("/onesite-reports")} className="border-[#0c7469] text-[#0c7469] hover:bg-[#eaf5f3]">View report</Button></div>) : <div className="p-7 text-center text-sm text-slate-500">No filed workbooks are available yet.</div>}</div></Panel>
  </div>;
}
