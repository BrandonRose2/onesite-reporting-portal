import { useAuth } from "@/_core/hooks/useAuth";
import { Panel } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Archive, CalendarClock, ChevronDown, FileOutput, History, Mail, Phone, Play, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const formatLabel = (format: string) => format.toUpperCase();
const statusLabel = (status: string) => status.replaceAll("_", " ");
const portalReportTitle = (title: string) => title.replace(/delinquent\s+and\s+prepaid\s*\(excel\)/gi, "Delinquency (Current Residents)");

type SettingsField = { key: string; label: string; type: "text" | "boolean"; default: string | boolean };
export type LiveEdgeStatus = { status: "ready" | "unavailable" | "interactive_required"; checkedAt: Date; lastReadyAt: Date | null; detail: string | null };
export const isLiveEdgeReady = (status: LiveEdgeStatus | null | undefined) => status?.status === "ready";

function parseSettingsSchema(raw?: string | null): SettingsField[] {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !Array.isArray(parsed.fields)) return [];
    return parsed.fields.filter((field: unknown): field is SettingsField => Boolean(field) && typeof (field as SettingsField).key === "string" && typeof (field as SettingsField).label === "string" && ((field as SettingsField).type === "text" || (field as SettingsField).type === "boolean") && (typeof (field as SettingsField).default === "string" || typeof (field as SettingsField).default === "boolean"));
  } catch {
    return [];
  }
}

export default function OneSiteReportingHub() {
  const { user, loading } = useAuth();
  const catalogQuery = trpc.onesiteReporting.catalog.useQuery();
  const requestsQuery = trpc.onesiteReporting.requests.useQuery();
  const documentsQuery = trpc.onesiteReporting.documents.useQuery();
  const liveEdgeStatusQuery = trpc.onesiteReporting.liveEdgeStatus.useQuery(undefined, { refetchInterval: 30_000 });
  const propertyContactsQuery = trpc.onesiteReporting.propertyContacts.useQuery();
  const internalUsersQuery = trpc.onesiteReporting.internalNotificationUsers.useQuery();
  const utils = trpc.useUtils();
  const [catalogId, setCatalogId] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogHighlight, setCatalogHighlight] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<"excel" | "pdf" | "csv">("pdf");
  const [generationMode, setGenerationMode] = useState<"generate_now" | "schedule_later">("generate_now");
  const [scheduledForLocal, setScheduledForLocal] = useState("");
  const [externalEmails, setExternalEmails] = useState("");
  const [contactPropertyId, setContactPropertyId] = useState("");
  const [notifyUserIds, setNotifyUserIds] = useState<number[]>([]);
  const [cloudService, setCloudService] = useState("");
  const [reportParameters, setReportParameters] = useState<Record<string, string | boolean>>({});
  const [showCustom, setShowCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customFormat, setCustomFormat] = useState<"excel" | "pdf" | "csv">("pdf");
  const selection = useMemo(() => catalogQuery.data?.find(item => String(item.id) === catalogId), [catalogId, catalogQuery.data]);
  const filteredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    return catalogQuery.data?.filter(item => !query || portalReportTitle(item.displayName).toLowerCase().includes(query) || item.exactReportName.toLowerCase().includes(query)) ?? [];
  }, [catalogQuery.data, catalogSearch]);
  const suggestedCatalog = filteredCatalog;
  const selectedPropertyContact = useMemo(() => propertyContactsQuery.data?.find(contact => String(contact.propertyId) === contactPropertyId), [contactPropertyId, propertyContactsQuery.data]);
  const isAdmin = user?.role === "admin";
  const liveEdgeReady = isLiveEdgeReady(liveEdgeStatusQuery.data);

  useEffect(() => {
    if (!catalogId && catalogQuery.data?.[0]) setCatalogId(String(catalogQuery.data[0].id));
  }, [catalogId, catalogQuery.data]);

  useEffect(() => {
    if (!selection) return;
    setSelectedFormat(selection.defaultFormat);
    setGenerationMode("generate_now");
    setScheduledForLocal("");
    setExternalEmails("");
    setNotifyUserIds([]);
    setCloudService("");
    setReportParameters(Object.fromEntries(parseSettingsSchema(selection.settingsSchemaJson).map(field => [field.key, field.default])));
  }, [selection?.id]);

  useEffect(() => {
    if (!contactPropertyId && propertyContactsQuery.data?.length) {
      const preferred = propertyContactsQuery.data.find(contact => contact.mappingStatus === "verified") ?? propertyContactsQuery.data[0];
      setContactPropertyId(String(preferred.propertyId));
    }
  }, [contactPropertyId, propertyContactsQuery.data]);

  useEffect(() => {
    if (selectedPropertyContact?.managerEmail) setExternalEmails(selectedPropertyContact.managerEmail);
  }, [selectedPropertyContact?.managerEmail]);

  const selectReport = (id: string) => {
    const report = catalogQuery.data?.find(item => String(item.id) === id);
    setCatalogId(id);
    setCatalogSearch(report ? portalReportTitle(report.displayName) : "");
    setCatalogOpen(false);
    setCatalogHighlight(0);
  };

  const handleCatalogKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestedCatalog.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setCatalogOpen(true); setCatalogHighlight(current => Math.min(current + 1, suggestedCatalog.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setCatalogOpen(true); setCatalogHighlight(current => Math.max(current - 1, 0)); }
    if (event.key === "Enter" && catalogOpen) { event.preventDefault(); selectReport(String(suggestedCatalog[catalogHighlight]?.id)); }
    if (event.key === "Escape") setCatalogOpen(false);
  };

  const refreshHistory = () => {
    utils.onesiteReporting.requests.invalidate();
    utils.onesiteReporting.catalog.invalidate();
    utils.onesiteReporting.liveEdgeStatus.invalidate();
  };
  const queueCatalog = trpc.onesiteReporting.queueCatalogReport.useMutation({
    onSuccess: result => { toast.success(`${result.reportName} queued with its Generate & Schedule settings.`); refreshHistory(); },
    onError: error => toast.error(error.message),
  });
  const queueCustom = trpc.onesiteReporting.queueCustomReport.useMutation({
    onSuccess: result => { toast.success(`${result.reportName} queued for all properties.`); setCustomTitle(""); setShowCustom(false); refreshHistory(); },
    onError: error => toast.error(error.message),
  });
  const syncMyReports = trpc.onesiteReporting.syncMyReports.useMutation({
    onSuccess: () => { toast.success("My Reports synchronization queued."); refreshHistory(); },
    onError: error => toast.error(error.message),
  });

  const queueConfiguredReport = () => {
    if (!selection) return;
    if (!liveEdgeReady) {
      toast.error("Open the authenticated RealPage Reports Hub in Microsoft Edge, then wait for the Live Edge status to show ready before queueing a report.");
      return;
    }
    if (generationMode === "schedule_later" && !scheduledForLocal) {
      toast.error("Choose a date and time before scheduling this report.");
      return;
    }
    const scheduledFor = generationMode === "schedule_later" && scheduledForLocal ? new Date(scheduledForLocal).toISOString() : undefined;
    queueCatalog.mutate({
      catalogId: selection.id,
      format: selectedFormat,
      settings: {
        mode: generationMode,
        ...(scheduledFor ? { scheduledFor } : {}),
        externalEmails: externalEmails.split(/[;,\n]/).map(value => value.trim()).filter(Boolean),
        notifyUserIds,
        ...(cloudService.trim() ? { cloudService: cloudService.trim() } : {}),
        reportParameters,
      },
    });
  };

  if (loading) return <div className="h-72 animate-pulse rounded-[1.25rem] bg-slate-100" />;
  if (!isAdmin) return <div className="grid min-h-80 place-items-center rounded-[1.25rem] border border-dashed bg-white p-8 text-center"><div><ShieldCheck className="mx-auto h-8 w-8 text-[#0c7469]" /><h1 className="mt-4 text-lg font-semibold text-[#122b4b]">Administrator access required</h1><p className="mt-2 max-w-md text-sm text-slate-600">Only portal administrators can configure, request, or synchronize OneSite reports.</p></div></div>;

  const queued = requestsQuery.data?.filter(item => item.request.status === "queued" || item.request.status === "running").length ?? 0;
  const completed = requestsQuery.data?.filter(item => item.request.status === "completed" || item.request.status === "completed_with_warnings").length ?? 0;

  return <div className="onesite-reporting-hub mx-auto max-w-6xl space-y-6">
    <section className="rounded-[1.5rem] bg-[#122b4b] p-6 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">All-property report operations</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">OneSite Reporting Hub</h1><p className="mt-2 max-w-3xl text-sm text-slate-200">Choose Delinquency or another approved OneSite report, modify Generate & Schedule settings, and request it for every mapped property.</p></div><div className="flex flex-wrap justify-end gap-2"><Badge className="border border-white/15 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">All properties</Badge><LiveEdgeReadiness status={liveEdgeStatusQuery.data} isLoading={liveEdgeStatusQuery.isLoading} /></div></div></section>
    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Approved report titles" value={catalogQuery.data?.length ?? 0} helper="Delinquency + OneSite management" /><Metric label="Queued / running" value={queued} helper="Requests awaiting collection" /><Metric label="Filed report runs" value={completed} helper="Completed request records" /></section>
    <LiveEdgeConnectionNotice status={liveEdgeStatusQuery.data} isLoading={liveEdgeStatusQuery.isLoading} />
    <section className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
      <Panel eyebrow="Request a OneSite report" title="Configure Generate & Schedule"><div className="space-y-5 p-5 sm:p-6">
        <div className="relative space-y-2"><Label htmlFor="onesite-catalog-search">Find a report</Label><Input id="onesite-catalog-search" value={catalogSearch} onFocus={() => setCatalogOpen(true)} onChange={event => { setCatalogSearch(event.target.value); setCatalogOpen(true); setCatalogHighlight(0); }} onKeyDown={handleCatalogKeyDown} placeholder={`Start typing to search ${catalogQuery.data?.length ?? 0} approved reports`} role="combobox" aria-expanded={catalogOpen} aria-controls="onesite-report-suggestions" aria-autocomplete="list" /><p className="text-xs text-slate-500">Type a title such as “rent roll” or “delinquency,” then choose a matching report.</p>{catalogOpen ? <div id="onesite-report-suggestions" role="listbox" className="absolute z-30 mt-1 max-h-[32rem] w-full overflow-y-auto rounded-xl border border-[#78a99a] bg-white p-1 shadow-[0_12px_30px_rgba(14,57,43,0.18)]"><p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{suggestedCatalog.length} matching {suggestedCatalog.length === 1 ? "report" : "reports"}</p>{suggestedCatalog.length ? suggestedCatalog.map((item, index) => <button key={item.id} type="button" role="option" aria-selected={String(item.id) === catalogId} onMouseDown={event => event.preventDefault()} onClick={() => selectReport(String(item.id))} className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors ${index === catalogHighlight ? "bg-[#e5f4ef]" : "hover:bg-[#f4faf8]"}`}><span className="flex items-center justify-between gap-3"><span className="font-semibold text-[#173d32]">{portalReportTitle(item.displayName)}</span><Badge variant="outline" className="shrink-0 text-[10px]">{formatLabel(item.defaultFormat)}</Badge></span><span className="mt-1 block text-xs text-slate-500">{item.reportArea ?? "Approved OneSite report"}</span></button>) : <p className="px-3 py-4 text-sm text-slate-500">No approved reports match “{catalogSearch}”.</p>}</div> : null}</div>
        {selection ? <div className="rounded-xl border border-[#d5ebe6] bg-[#f5fbfa] p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[#82c5ba] bg-white text-[#0c7469]">{formatLabel(selectedFormat)}</Badge>{selection.isVerified ? <Badge className="bg-[#0c7469] text-white hover:bg-[#0c7469]">Verified title</Badge> : <Badge variant="outline">Approved report</Badge>}</div><p className="mt-3 text-sm font-medium text-[#122b4b]">{portalReportTitle(selection.displayName)}</p><p className="mt-1 text-xs leading-5 text-slate-600">{selection.reportArea ?? "Approved OneSite report"} · {selection.description ?? "This request will be generated with the approved report configuration."}</p></div> : null}
        <div className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"><div className="space-y-2"><Label>Generation timing</Label><Select value={generationMode} onValueChange={value => setGenerationMode(value as "generate_now" | "schedule_later")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="generate_now">Generate now</SelectItem><SelectItem value="schedule_later">Schedule for later</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Requested export format</Label><Select value={selectedFormat} onValueChange={value => setSelectedFormat(value as "excel" | "pdf" | "csv")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="excel">Excel</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="csv">CSV</SelectItem></SelectContent></Select></div>{generationMode === "schedule_later" ? <div className="space-y-2 sm:col-span-2"><Label htmlFor="scheduled-at">Date and time</Label><Input id="scheduled-at" type="datetime-local" value={scheduledForLocal} onChange={event => setScheduledForLocal(event.target.value)} /></div> : null}</div>
        <PropertyContactAutofill contacts={propertyContactsQuery.data ?? []} selectedId={contactPropertyId} onSelect={setContactPropertyId} />
        <div className="space-y-2"><Label htmlFor="external-emails">External completion emails</Label><Input id="external-emails" value={externalEmails} onChange={event => setExternalEmails(event.target.value)} placeholder="manager@example.com; accounting@example.com" /><p className="text-xs text-slate-500">Selecting a property automatically fills its authorized Company Contacts email when available. You may add additional recipients with commas, semicolons, or new lines.</p></div>
        <div className="space-y-2"><Label>Internal completion notifications</Label><div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">{internalUsersQuery.data?.length ? internalUsersQuery.data.map(recipient => <label key={recipient.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-[#122b4b]"><input type="checkbox" checked={notifyUserIds.includes(recipient.id)} onChange={event => setNotifyUserIds(current => event.target.checked ? [...current, recipient.id] : current.filter(id => id !== recipient.id))} className="h-4 w-4 accent-[#0c7469]" /><span className="min-w-0 truncate">{recipient.name ?? recipient.email ?? `User ${recipient.id}`}</span></label>) : <p className="text-xs text-slate-500">No internal portal users are currently available for notification.</p>}</div><p className="text-xs text-slate-500">Optional. Selected recipients are stored with this report request for OneSite completion notification.</p></div>
        <div className="space-y-2"><Label htmlFor="cloud-service">Cloud service delivery option</Label><Input id="cloud-service" value={cloudService} onChange={event => setCloudService(event.target.value)} placeholder="Optional OneSite cloud-service option" /></div>
        <StructuredReportSettings fields={parseSettingsSchema(selection?.settingsSchemaJson)} values={reportParameters} onChange={setReportParameters} />
        <Button disabled={!selection || !liveEdgeReady || queueCatalog.isPending} onClick={queueConfiguredReport} className="hunter-metal-button w-full"><CalendarClock className="mr-2 h-4 w-4" />{queueCatalog.isPending ? "Saving settings and queueing…" : !liveEdgeReady ? "Open signed-in Edge to queue" : generationMode === "schedule_later" ? "Schedule report for all properties" : "Generate report for all properties"}</Button>
        <p className="text-xs leading-5 text-slate-500">The request records the selected title, all-property scope, timing, output format, delivery choices, and parameter settings before the trusted OneSite runner begins work.</p>
        <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0c7469]" onClick={() => setShowCustom(current => !current)}><ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCustom ? "rotate-180" : ""}`} />Report title not listed?</button>
        {showCustom ? <div className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_130px]"><div className="space-y-2"><Label htmlFor="custom-title">Exact OneSite report title</Label><Input id="custom-title" value={customTitle} onChange={event => setCustomTitle(event.target.value)} placeholder="Use the title displayed in OneSite Reports" /></div><div className="space-y-2"><Label>Format</Label><Select value={customFormat} onValueChange={value => setCustomFormat(value as "excel" | "pdf" | "csv")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="excel">Excel</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="csv">CSV</SelectItem></SelectContent></Select></div><Button className="hunter-metal-button sm:col-span-2" disabled={!customTitle.trim() || !liveEdgeReady || queueCustom.isPending} onClick={() => queueCustom.mutate({ exactReportName: customTitle, format: customFormat })}>Queue custom all-property request</Button></div> : null}
      </div></Panel>
      <Panel eyebrow="My Reports" title="Retrieve reports you generated yourself"><div className="space-y-5 p-5 sm:p-6"><div className="rounded-xl border border-[#eed79d] bg-[#fffaf0] p-4 text-sm text-[#745116]"><p className="font-semibold">Synchronize the OneSite My Reports workspace</p><p className="mt-1 text-xs leading-5 text-slate-600">Use this after generating a report directly in OneSite. The runner will retrieve newly available outputs, associate them with properties, file the source documents, and begin summary generation.</p></div><Button onClick={() => syncMyReports.mutate()} disabled={!liveEdgeReady || syncMyReports.isPending} className="hunter-metal-button w-full"><RefreshCw className={`mr-2 h-4 w-4 ${syncMyReports.isPending ? "animate-spin" : ""}`} />{syncMyReports.isPending ? "Queueing synchronization…" : !liveEdgeReady ? "Open signed-in Edge to sync" : "Sync My Reports"}</Button><div className="flex gap-3 rounded-xl bg-slate-50 p-4"><Archive className="h-5 w-5 shrink-0 text-[#0c7469]" /><p className="text-xs leading-5 text-slate-600">The portal retains the original source output, filing metadata, property association, Markdown summary, and generated PDF once the runner processes the request.</p></div></div></Panel>
    </section>
    <Panel eyebrow="My Reports activity" title="Report requests and retrieval status"><div className="divide-y divide-slate-100">{requestsQuery.data?.length ? requestsQuery.data.map(({ request, catalog }) => <div key={request.id} className="flex flex-wrap items-start justify-between gap-4 p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="capitalize">{statusLabel(request.status)}</Badge><Badge variant="outline">{request.requestType === "sync_my_reports" ? "My Reports sync" : "All properties"}</Badge><Badge variant="outline">{formatLabel(request.requestedFormat)}</Badge></div><p className="mt-2 truncate text-sm font-semibold text-[#122b4b]">{portalReportTitle(catalog?.displayName ?? request.requestedReportName)}</p><p className="mt-1 text-xs text-slate-500">Requested {new Date(request.requestedAt).toLocaleString()} · {request.documentCount} archived documents</p>{request.errorMessage ? <p className="mt-2 text-xs text-[#b44851]">{request.errorMessage}</p> : null}</div><History className="h-4 w-4 text-slate-400" /></div>) : <div className="p-7 text-center text-sm text-slate-500"><FileOutput className="mx-auto mb-3 h-6 w-6 text-slate-400" />No OneSite report requests yet. Select a title above to create the first all-property request.</div>}</div></Panel>
    <Panel eyebrow="Filed property workbooks" title="Completed My Reports documents"><div className="divide-y divide-slate-100">{documentsQuery.data?.length ? documentsQuery.data.map(document => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="capitalize">{statusLabel(document.requestStatus)}</Badge><Badge variant="outline">{document.region ?? "Portfolio property"}</Badge></div><p className="mt-2 truncate text-sm font-semibold text-[#122b4b]">{document.propertyName ?? "Portfolio report"}</p><p className="mt-1 truncate text-xs text-slate-500">{document.originalFilename.replace(/delinquent\s+and\s+prepaid/ig, "delinquency")} · {(document.fileSizeBytes / 1024).toFixed(0)} KB · filed {new Date(document.createdAt).toLocaleString()}</p></div><a href={document.storageUrl} target="_blank" rel="noreferrer" className="hunter-metal-button inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-white">Open workbook</a></div>) : <div className="p-7 text-center text-sm text-slate-500"><Archive className="mx-auto mb-3 h-6 w-6 text-slate-400" />No filed OneSite workbooks are available yet.</div>}</div></Panel>
  </div>;
}

function Metric({ label, value, helper }: { label: string; value: number; helper: string }) {
  return <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-[#122b4b]">{value}</p><p className="mt-1 text-xs text-slate-500">{helper}</p></div>;
}

function LiveEdgeReadiness({ status, isLoading }: { status: LiveEdgeStatus | null | undefined; isLoading: boolean }) {
  if (isLoading) return <Badge className="border border-white/15 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">Checking Microsoft Edge…</Badge>;
  if (status?.status === "ready") return <Badge className="border border-[#77d2c5] bg-[#0c7469] px-3 py-1.5 text-white hover:bg-[#0c7469]">Live Edge ready</Badge>;
  const helper = status?.status === "interactive_required" ? "Edge action required" : "Open signed-in Edge";
  return <Badge variant="outline" title={status?.detail ?? "Open the authenticated RealPage Reports Hub in Microsoft Edge before a queued request runs."} className="border-[#e9c979] bg-[#5b4925] px-3 py-1.5 text-[#fff6dc] hover:bg-[#5b4925]">{helper}</Badge>;
}

export function LiveEdgeConnectionNotice({ status, isLoading }: { status: LiveEdgeStatus | null | undefined; isLoading: boolean }) {
  if (isLoading) return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Checking the live Microsoft Edge connection…</div>;
  const timestamps = status ? <> Last checked: {new Date(status.checkedAt).toLocaleString()}. Last ready: {status.lastReadyAt ? new Date(status.lastReadyAt).toLocaleString() : "not yet recorded"}.</> : null;
  if (status?.status === "ready") return <div className="rounded-xl border border-[#bde4dc] bg-[#f2fbf9] p-4 text-sm text-[#155d55]"><span className="font-semibold">Live Microsoft Edge is ready.</span> Requests can be queued while the authenticated RealPage Reports Hub remains open.{timestamps}</div>;
  const reason = status?.detail ? ` Last check: ${status.detail}` : "";
  return <div className="rounded-xl border border-[#ecd59b] bg-[#fff9eb] p-4 text-sm text-[#745116]"><span className="font-semibold">Before queueing a report:</span> Open Microsoft Edge on your Mac, sign in to RealPage, and leave the Reports Hub open. The status will refresh automatically once the runner confirms the connection.{reason}{timestamps}</div>;
}

function StructuredReportSettings({ fields, values, onChange }: { fields: SettingsField[]; values: Record<string, string | boolean>; onChange: (values: Record<string, string | boolean>) => void }) {
  return <div className="rounded-xl border border-[#d5ebe6] bg-[#f5fbfa] p-4"><div className="flex items-start gap-3"><Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0c7469]" /><div><p className="text-sm font-semibold text-[#122b4b]">Report-specific parameters</p><p className="mt-1 text-xs leading-5 text-slate-600">These fields mirror the captured Generate & Schedule controls for the selected OneSite report. They are saved with this request and applied by the runner before generation.</p></div></div>{fields.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{fields.map(field => field.type === "boolean" ? <label key={field.key} className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-[#cfe4df] bg-white px-3 py-2 text-sm text-[#122b4b]"><span>{field.label}</span><input type="checkbox" checked={Boolean(values[field.key])} onChange={event => onChange({ ...values, [field.key]: event.target.checked })} className="h-4 w-4 accent-[#0c7469]" /></label> : <div key={field.key} className="space-y-2"><Label htmlFor={`report-setting-${field.key}`}>{field.label}</Label><Input id={`report-setting-${field.key}`} value={String(values[field.key] ?? "")} onChange={event => onChange({ ...values, [field.key]: event.target.value })} /></div>)}</div> : <div className="mt-3 rounded-lg border border-dashed border-[#b8d7d0] bg-white/70 p-3 text-xs leading-5 text-slate-600">No report-specific settings have been captured for this title yet. The portal will retain OneSite’s own defaults; capture this report’s Generate & Schedule form before enabling customized settings.</div>}</div>;
}

type PropertyContactPreview = { propertyId: number; propertyName: string; region: string; managerName: string | null; managerEmail: string | null; mobilePhone: string | null; officePhone: string | null; extension: string | null; mappingStatus: "verified" | "review_required" | "unmapped" | null };

function PropertyContactAutofill({ contacts, selectedId, onSelect }: { contacts: PropertyContactPreview[]; selectedId: string; onSelect: (id: string) => void }) {
  const contact = contacts.find(item => String(item.propertyId) === selectedId);
  const status = contact?.mappingStatus ?? "unmapped";
  const statusLabel = status === "verified" ? "Verified contact" : status === "review_required" ? "Review contact" : "Contact not mapped";
  const statusClass = status === "verified" ? "border-[#9acdbf] bg-[#edf9f4] text-[#166249]" : "border-[#e8ce8d] bg-[#fff8e7] text-[#795414]";
  const officeLine = [contact?.officePhone, contact?.extension ? `ext. ${contact.extension}` : null].filter(Boolean).join(" · ") || "Not available";
  return <div className="rounded-xl border border-[#b9d7cf] bg-[#f1faf7] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#122b4b]">Property contact autofill</p><p className="mt-1 text-xs leading-5 text-slate-600">Select a building to load its authorized Company Contacts details into this report configuration.</p></div>{contact ? <Badge variant="outline" className={statusClass}>{statusLabel}</Badge> : null}</div><div className="mt-4 space-y-2"><Label htmlFor="property-contact">Selected property</Label><Select value={selectedId} onValueChange={onSelect}><SelectTrigger id="property-contact"><SelectValue placeholder="Choose a property" /></SelectTrigger><SelectContent>{contacts.map(item => <SelectItem key={item.propertyId} value={String(item.propertyId)}>{item.propertyName} · {item.region}</SelectItem>)}</SelectContent></Select></div>{contact ? <div className="mt-4 grid gap-3 rounded-lg border border-[#c7dfd8] bg-white/90 p-3 sm:grid-cols-2"><ContactField label="Manager / contact" value={contact.managerName || "Contact name requires review"} /><ContactField label="Email" value={contact.managerEmail || "Not available"} icon="mail" /><ContactField label="Mobile" value={contact.mobilePhone || "Not available"} icon="phone" /><ContactField label="Office / extension" value={officeLine} /></div> : null}</div>;
}

function ContactField({ label, value, icon }: { label: string; value: string; icon?: "mail" | "phone" }) {
  const Icon = icon === "mail" ? Mail : icon === "phone" ? Phone : null;
  return <div className={Icon ? "flex items-start gap-2" : ""}>{Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#27735a]" /> : null}<div><p className="text-[11px] font-bold uppercase tracking-[0.11em] text-[#437d70]">{label}</p><p className="mt-1 break-all text-sm font-medium text-[#173d32]">{value}</p></div></div>;
}
