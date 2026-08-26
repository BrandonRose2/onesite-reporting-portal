import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, FileText, FolderOpen, History, Loader2, Paperclip, X } from "lucide-react";
import { useState } from "react";

const formatDateTime = (value: Date | string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default function ReportLibrary() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: requests = [], isLoading } = trpc.requests.list.useQuery({ limit: 100 });
  const { data: details, isLoading: loadingDetails } = trpc.requests.details.useQuery({ id: selectedId ?? 1 }, { enabled: selectedId !== null });
  return <DashboardLayout><PageHeader eyebrow="Review Reports / Report Library" title="Report library" description="Review request status, warnings, runner summaries, and property-level documents filed by the recovered reporting workflow." />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">Request history</p><h2 className="mt-1 text-base font-semibold text-slate-950">All portal report requests</h2></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{requests.length}</span></div>{isLoading ? <div className="grid min-h-72 place-items-center text-sm text-slate-500"><Loader2 className="mb-2 h-4 w-4 animate-spin" />Loading report history…</div> : requests.length ? <div className="divide-y divide-slate-100">{requests.map(request => <button key={request.id} onClick={() => setSelectedId(request.id)} className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors ${selectedId === request.id ? "bg-[#f1fbf8]" : "hover:bg-slate-50"}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{request.requestedReportName}</span><span className="mt-1 block text-xs text-slate-500">Request #{request.id} · {formatDateTime(request.createdAt)}</span></span><StatusBadge status={request.status} /></button>)}</div> : <EmptyLibrary />}</section>
      <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]">{selectedId === null ? <div className="grid min-h-72 place-items-center p-8 text-center"><div><FolderOpen className="mx-auto h-5 w-5 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-800">Select a report request</p><p className="mt-1 text-xs leading-5 text-slate-500">Status, documents, warnings, and the runner summary appear here.</p></div></div> : loadingDetails ? <div className="grid min-h-72 place-items-center text-sm text-slate-500"><Loader2 className="mb-2 h-4 w-4 animate-spin" />Loading details…</div> : details ? <RequestDetails details={details} onClose={() => setSelectedId(null)} /> : <div className="p-6 text-sm text-slate-500">This request is unavailable.</div>}</aside>
    </div></DashboardLayout>;
}

function EmptyLibrary() { return <div className="grid min-h-72 place-items-center p-8 text-center"><div><History className="mx-auto h-5 w-5 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-800">No report history yet</p><p className="mt-1 text-xs leading-5 text-slate-500">Completed documents will appear here after the secure runner files them to a request.</p></div></div>; }

type RequestDetailView = {
  request: {
    id: number;
    requestType: "generate_all_properties" | "generate_property" | "sync_my_reports";
    requestedReportName: string;
    requestedFormat: "excel" | "pdf" | "csv";
    status: string;
    warningSummary: string | null;
    errorMessage: string | null;
    summaryMarkdown: string | null;
  };
  properties: Array<{ name: string }>;
  documents: Array<{ id: number; storageUrl: string; originalFilename: string; propertyName: string }>;
  events: Array<{ id: number; eventType: string; detail: string | null }>;
};

function RequestDetails({ details, onClose }: { details: RequestDetailView; onClose: () => void }) {
  const { request, documents, events, properties } = details;
  return <div><div className="flex items-start justify-between border-b border-slate-100 p-5"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">Request #{request.id}</p><h2 className="mt-1 truncate text-base font-semibold text-slate-950">{request.requestedReportName}</h2><div className="mt-3"><StatusBadge status={request.status} /></div></div><Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button></div><div className="space-y-5 p-5"><section><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Scope</p><p className="mt-1 text-sm text-slate-800">{request.requestType === "generate_property" ? properties[0]?.name ?? "Single property" : request.requestType === "generate_all_properties" ? `${properties.length} property${properties.length === 1 ? "" : "ies"}` : "My Reports discovery"} · {request.requestedFormat.toUpperCase()}</p></section>{request.warningSummary ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><p className="text-xs font-semibold text-amber-900">Runner warning</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-amber-800">{request.warningSummary}</p></div></div></section> : null}{request.errorMessage ? <section className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-xs font-semibold text-rose-900">Runner failure</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-rose-800">{request.errorMessage}</p></section> : null}{request.summaryMarkdown ? <section><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Runner summary</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{request.summaryMarkdown}</p></section> : null}<section><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Filed documents</p>{documents.length ? <div className="mt-2 space-y-2">{documents.map(document => <a key={document.id} href={document.storageUrl} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700 transition-colors hover:bg-slate-50"><Paperclip className="h-3.5 w-3.5 text-[#087365]" /><span className="min-w-0 flex-1 truncate">{document.originalFilename}</span><span className="text-[10px] text-slate-400">{document.propertyName}</span></a>)}</div> : <p className="mt-2 text-xs leading-5 text-slate-500">No documents have been filed to this request.</p>}</section><section><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Activity</p><div className="mt-2 space-y-2">{events.map(event => <div key={event.id} className="border-l border-slate-200 pl-3"><p className="text-xs font-semibold capitalize text-slate-700">{event.eventType.replaceAll("_", " ")}</p>{event.detail ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{event.detail}</p> : null}</div>)}</div></section></div></div>;
}
