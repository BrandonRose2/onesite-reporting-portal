import { Panel } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CalendarDays, FileCheck2, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

function dateLabel(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function History() {
  const [, setLocation] = useLocation();
  const periodsQuery = trpc.delinquency.periods.useQuery();
  if (periodsQuery.isLoading) return <Skeleton className="h-96 rounded-[1.25rem]" />;
  const periods = periodsQuery.data ?? [];
  return <div className="space-y-6"><section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0c7469]">Immutable snapshots</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] text-[#122b4b]">Reporting period history</h1><p className="mt-2 text-sm text-slate-600">Every successful batch becomes a source-traceable reporting period for review and comparison.</p></div><Button onClick={() => setLocation("/refresh")} className="bg-[#0c7469] hover:bg-[#095e56]"><RefreshCw className="mr-2 h-4 w-4" />Run Scraper</Button></section><Panel title="Stored reporting periods" eyebrow={`${periods.length} snapshots`}><div className="divide-y divide-slate-100">{periods.map(period => <div key={period.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3f7fb] text-[#17365d]"><CalendarDays className="h-5 w-5" /></div><div><p className="font-semibold text-[#122b4b]">{period.name}</p><p className="mt-1 text-xs text-slate-500">Fiscal Period {period.fiscalPeriod} · As of {dateLabel(period.asOfDate)}</p></div></div><div className="flex items-center gap-4"><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Source files</p><p className="mt-1 text-sm font-semibold text-[#122b4b]">{period.sourceFileCount}</p></div><Badge className={period.status === "ready" ? "bg-[#eaf5f3] text-[#0c7469] hover:bg-[#eaf5f3]" : period.status === "failed" ? "bg-[#fff1f2] text-[#b44851] hover:bg-[#fff1f2]" : "bg-[#fff8e7] text-[#b7791f] hover:bg-[#fff8e7]"}>{period.status}</Badge></div></div>)}{!periods.length ? <div className="px-6 py-12 text-center"><FileCheck2 className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-[#122b4b]">No reporting periods have been imported.</p><p className="mt-1 text-sm text-slate-500">Use Run Scraper to archive the first 35-property XLS batch.</p></div> : null}</div></Panel></div>;
}
