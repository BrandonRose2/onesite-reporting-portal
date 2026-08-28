import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/portal/PageHeader";
import { YardiSessionPanel } from "@/components/portal/YardiSessionPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ChevronDown, Info, Loader2, Save, Search, Send, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState, type WheelEvent } from "react";
import { useLocation } from "wouter";

type Scope = "generate_all_properties" | "generate_property" | "sync_my_reports";
type ParameterDefinition = { key: string; label: string; type: "text" | "number" | "select" | "boolean" | "date"; required?: boolean; description?: string; options?: Array<{ label: string; value: string }>; defaultValue?: string | number | boolean };

const editableFieldClass = "border-violet-300 bg-violet-50/80 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] transition-colors hover:border-violet-500 hover:bg-violet-100/80 focus:border-violet-600 focus:bg-white focus:ring-2 focus:ring-violet-500/25";

function getParameterDefinitions(metadata: Record<string, unknown>): ParameterDefinition[] {
  const raw = metadata.parameterDefinitions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is ParameterDefinition => Boolean(item) && typeof item === "object" && typeof (item as ParameterDefinition).key === "string" && typeof (item as ParameterDefinition).label === "string" && ["text", "number", "select", "boolean", "date"].includes((item as ParameterDefinition).type));
}

function defaultsFor(definitions: ParameterDefinition[]) {
  return Object.fromEntries(definitions.filter(definition => definition.defaultValue !== undefined).map(definition => [definition.key, definition.defaultValue])) as Record<string, unknown>;
}

function getProviderEligibility(metadata: Record<string, unknown>) {
  const raw = metadata.providerEligibility;
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as { complete?: unknown; properties?: unknown };
  if (candidate.complete !== true || !Array.isArray(candidate.properties)) return null;
  const names = candidate.properties.flatMap(item => {
    if (!item || typeof item !== "object" || typeof (item as { name?: unknown }).name !== "string") return [];
    const name = (item as { name: string }).name.trim();
    return name ? [name] : [];
  });
  return names.length ? names : null;
}

function normalizedSearchTerms(value: string) {
  const aliases: Record<string, string> = { delinquency: "delinquent", delinquent: "delinquent" };
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).map(term => aliases[term] ?? term);
}

function isOutsidePacificWorkHours(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return values.weekday === "Sat" || values.weekday === "Sun" || Number(values.hour ?? "0") >= 18;
}

export default function ReportRequest({ source = "OneSite" }: { source?: "OneSite" | "Yardi" }) {
  const [, setLocation] = useLocation();
  const runnerSource = source === "Yardi" ? "yardi" as const : "onesite" as const;
  const { data: catalog = [], isLoading: loadingCatalog } = trpc.catalog.list.useQuery({ source: runnerSource });
  const { data: properties = [] } = trpc.properties.list.useQuery({ includeInactive: false, source: runnerSource });
  const [scope, setScope] = useState<Scope>("generate_all_properties");
  const [catalogId, setCatalogId] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [format, setFormat] = useState<"excel" | "pdf" | "csv" | null>("excel");
  const [parameterValues, setParameterValues] = useState<Record<string, unknown>>({});
  const [advancedParametersText, setAdvancedParametersText] = useState("{}");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [validatedParameters, setValidatedParameters] = useState<Record<string, unknown>>({});
  const [outsideWorkHours, setOutsideWorkHours] = useState(() => isOutsidePacificWorkHours());
  const mutation = trpc.requests.create.useMutation({ onSuccess: () => setLocation("/library") });
  const savedDefaults = trpc.requests.defaults.useQuery({ source: runnerSource, catalogId: Number(catalogId) || 1 }, { enabled: Boolean(catalogId) });
  const saveDefaults = trpc.requests.saveDefaults.useMutation({ onSuccess: () => void savedDefaults.refetch() });
  const selectedReport = useMemo(() => catalog.find(item => item.id === Number(catalogId)), [catalog, catalogId]);
  const filteredCatalog = useMemo(() => {
    const terms = normalizedSearchTerms(reportSearch);
    if (!terms.length) return catalog;
    return catalog.filter(item => {
      const searchable = normalizedSearchTerms(item.exactReportName);
      return terms.every(term => searchable.some(candidate => candidate.includes(term)));
    });
  }, [catalog, reportSearch]);
  const parameterDefinitions = useMemo(() => selectedReport ? getParameterDefinitions(selectedReport.runnerMetadata) : [], [selectedReport]);
  const providerEligibility = useMemo(() => selectedReport ? getProviderEligibility(selectedReport.runnerMetadata) : null, [selectedReport]);

  useEffect(() => {
    const replaceLegacyScopeCopy = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node = walker.nextNode();
      while (node) {
        if (node.textContent?.toLowerCase().includes("all active properties")) nodes.push(node as Text);
        node = walker.nextNode();
      }
      for (const textNode of nodes) textNode.textContent = textNode.textContent?.replace(/all active properties/gi, "All Properties") ?? "";
    };
    replaceLegacyScopeCopy();
    const observer = new MutationObserver(replaceLegacyScopeCopy);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedReport) { setFormat(null); setParameterValues({}); setAdvancedParametersText("{}"); return; }
    const catalogDefaults = defaultsFor(getParameterDefinitions(selectedReport.runnerMetadata));
    const saved = savedDefaults.data;
    const nextParameters = saved?.parameterValues && typeof saved.parameterValues === "object" ? saved.parameterValues : catalogDefaults;
    setFormat(saved?.requestedFormat ?? selectedReport.availableFormats[0] ?? null);
    setParameterValues(nextParameters);
    setAdvancedParametersText(JSON.stringify(nextParameters, null, 2));
  }, [selectedReport?.id, savedDefaults.data?.id]);

  useEffect(() => {
    const refresh = () => setOutsideWorkHours(isOutsidePacificWorkHours());
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const validateDraft = () => {
    if (outsideWorkHours) { setError("It is outside your work hours. Please do not start, save, or authorize report work after 6:00 PM Pacific Time or on weekends."); return; }
    if (!selectedReport && scope !== "sync_my_reports") { setError("Select an approved report from the source catalog before submitting."); return; }
    if (!format && scope !== "sync_my_reports") { setError("This report’s output format has not been inspected. Complete its one-time provider setup before it can be authorized."); return; }
    let reportParameters = parameterValues;
    if (!parameterDefinitions.length && scope !== "sync_my_reports") {
      try { reportParameters = JSON.parse(advancedParametersText) as Record<string, unknown>; } catch { setError("Advanced parameters must be valid JSON, for example {}."); return; }
    }
    setError(null);
    setValidatedParameters(reportParameters);
    setConfirmationOpen(true);
  };

  const confirmAndAuthorize = () => {
    if ((!selectedReport || !format) && scope !== "sync_my_reports") return;
    mutation.mutate({
      source: runnerSource,
      requestType: scope,
      catalogId: selectedReport?.id,
      requestedReportName: selectedReport?.exactReportName ?? "My Reports discovery",
      requestedFormat: format ?? "excel",
      propertyId: scope === "generate_property" ? Number(propertyId) : undefined,
      parameters: validatedParameters,
      executionAuthorized: true,
    });
  };

  const saveCurrentDefaults = () => {
    if (outsideWorkHours) { setError("It is outside your work hours. Please do not start, save, or authorize report work after 6:00 PM Pacific Time or on weekends."); return; }
    if (!selectedReport) return;
    if (!format) { setError("This report’s output format has not been inspected. Save defaults after its one-time provider setup."); return; }
    let reportParameters = parameterValues;
    if (!parameterDefinitions.length) {
      try { reportParameters = JSON.parse(advancedParametersText) as Record<string, unknown>; } catch { setError("Advanced parameters must be valid JSON before saving this report setup."); return; }
    }
    setError(null);
    saveDefaults.mutate({ source: runnerSource, catalogId: selectedReport.id, requestedFormat: format, parameters: reportParameters });
  };

  const step = scope === "generate_property" ? 4 : 3;
  const controlPickerWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.deltaY) return;
    event.preventDefault();
    event.stopPropagation();
    const controlledStep = Math.min(56, Math.max(22, Math.abs(event.deltaY) * 0.2));
    event.currentTarget.scrollBy({ top: Math.sign(event.deltaY) * controlledStep, behavior: "auto" });
  };
  return <DashboardLayout><PageHeader eyebrow={`Pull Reports / ${source}`} title={`Request a ${source} report`} description="Choose an approved report, set its supported parameters, and route it to all active properties or one selected property." />
    {outsideWorkHours ? <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-sm"><p className="font-semibold">After-hours reminder</p><p className="mt-1 leading-6">Please do not start, save, or authorize report work after 6:00 PM Pacific Time or on weekends.</p></div> : null}
    {source === "Yardi" ? <YardiSessionPanel /> : null}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)] sm:p-7"><div className="space-y-7">
      <fieldset><legend className="text-sm font-semibold text-slate-950">1. Select report scope</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{([{ value: "generate_all_properties", title: "All active properties", description: "Run the configured report against every active portal property." }, { value: "generate_property", title: "Selected property", description: "Run only against one active property you select." }, { value: "sync_my_reports", title: "My Reports retrieval", description: "Retrieve provider-generated outputs that the runner can safely match and file." }] as Array<{ value: Scope; title: string; description: string }>).map(option => <label key={option.value} className={`cursor-pointer rounded-xl border p-4 transition-colors ${scope === option.value ? "border-[#0b8775] bg-[#f0fbf8]" : "border-slate-200 hover:border-slate-300"}`}><input className="sr-only" type="radio" name="scope" checked={scope === option.value} onChange={() => { setScope(option.value); setError(null); }} /><span className="block text-sm font-semibold text-slate-900">{option.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span></label>)}</div></fieldset>
      {scope !== "sync_my_reports" ? <fieldset><legend className="flex items-center gap-2 text-sm font-semibold text-slate-950">2. Select an approved {source} report <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-700">Choose</span></legend><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="report-search" className="flex items-center justify-between gap-2">Report title <span className="text-[11px] font-medium text-[#087365]">{loadingCatalog ? "Syncing…" : `${catalog.length} active reports`}</span></Label><div className="relative mt-1.5"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-violet-600" /><Input id="report-search" value={reportSearch} onFocus={() => setPickerOpen(true)} onChange={event => { setReportSearch(event.target.value); setPickerOpen(true); }} onKeyDown={event => { if (event.key === "Escape") setPickerOpen(false); }} placeholder={`Search ${source} report titles`} className={`h-11 pl-9 text-sm ${editableFieldClass}`} aria-controls="report-results" aria-expanded={pickerOpen} /><button type="button" onClick={() => setPickerOpen(open => !open)} className={`mt-2 flex h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium outline-none ${editableFieldClass}`}><span className="truncate">{selectedReport?.exactReportName ?? (loadingCatalog ? "Loading approved reports…" : `Select a ${source} report`)}</span><ChevronDown className={`h-4 w-4 shrink-0 text-violet-600 transition-transform ${pickerOpen ? "rotate-180" : ""}`} /></button>{pickerOpen ? <div id="report-results" role="listbox" aria-label={`${source} report results`} onWheel={controlPickerWheel} className="absolute z-20 mt-1 max-h-72 w-full snap-y snap-proximity overscroll-contain overflow-y-auto rounded-xl border border-violet-300 bg-white p-1 shadow-xl shadow-violet-950/10">{filteredCatalog.length ? filteredCatalog.map(item => <button key={item.id} type="button" role="option" aria-selected={selectedReport?.id === item.id} onClick={() => { setCatalogId(String(item.id)); setPickerOpen(false); setError(null); }} className={`flex w-full snap-start rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${selectedReport?.id === item.id ? "bg-violet-100 text-violet-950" : "hover:bg-violet-50"}`}>{item.exactReportName}</button>) : <p className="px-3 py-4 text-sm text-slate-500">No report titles match “{reportSearch}”.</p>}</div> : null}</div><p className="mt-2 text-xs text-violet-700">{filteredCatalog.length} matching title{filteredCatalog.length === 1 ? "" : "s"}.</p></div><div><Label>Allowed formats</Label>{selectedReport && !selectedReport.availableFormats.length ? <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900"><strong>Not yet inspected.</strong> The provider’s available formats will be captured during one-time setup.</div> : <div className="mt-1.5 flex h-11 gap-2">{(["excel", "pdf", "csv"] as const).map(item => <button key={item} disabled={!selectedReport?.availableFormats.includes(item)} onClick={() => setFormat(item)} type="button" className={`rounded-lg border px-3 text-xs font-semibold capitalize transition-colors ${format === item ? "border-violet-500 bg-violet-100 text-violet-800 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:bg-violet-50"} disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:opacity-100`}>{item}</button>)}</div>}</div></div></fieldset> : null}
      {scope === "generate_property" ? <fieldset><legend className="flex items-center gap-2 text-sm font-semibold text-slate-950">3. Select property <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087365]">Choose</span></legend><div className="mt-3 max-w-md"><Label htmlFor="property">Active property</Label><select id="property" value={propertyId} onChange={event => setPropertyId(event.target.value)} className={`mt-1.5 h-11 w-full rounded-lg px-3 text-sm font-medium outline-none ${editableFieldClass}`}><option value="">Select a property</option>{properties.map(property => <option key={property.id} value={property.id}>{property.name}{property.market ? ` · ${property.market}` : ""}</option>)}</select><p className="mt-1.5 text-xs text-[#356e65]">This green selector changes the report scope to one property only.</p></div></fieldset> : null}
      {scope !== "sync_my_reports" ? <fieldset><legend className="flex items-center gap-2 text-sm font-semibold text-slate-950"><SlidersHorizontal className="h-4 w-4 text-[#087365]" />{step}. Configure report parameters</legend>{selectedReport ? parameterDefinitions.length ? <><p className="mt-1 text-xs leading-5 text-slate-500">These controls reflect the approved parameter model captured for this {source} report. {savedDefaults.data ? "Your saved report setup is loaded." : "Save this setup once to prefill future runs."}</p><ParameterFields definitions={parameterDefinitions} values={parameterValues} onChange={(key, value) => setParameterValues(current => ({ ...current, [key]: value }))} /></> : <><div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><strong>One-time setup needed.</strong> This report has no captured provider controls or output format yet. An authorized Edge operator must inspect the {source} form first; no provider submission is available until its permitted settings are captured.</div><details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Advanced parameters for an already-supported report</summary><Textarea value={advancedParametersText} onChange={event => setAdvancedParametersText(event.target.value)} className="mt-3 min-h-28 font-mono text-xs" spellCheck={false} /></details></> : <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">Choose a report to load its approved parameter controls.</div>}</fieldset> : null}
      {scope === "generate_all_properties" && selectedReport && providerEligibility ? <section aria-live="polite" className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3"><p className="text-sm font-semibold text-violet-950">Provider-eligible scope: {providerEligibility.length} properties</p><p className="mt-1 text-xs leading-5 text-violet-900">This request will include exactly the properties currently eligible for this provider report, not every directory record. The scope is enforced before the request is queued.</p><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-violet-800">View eligible properties</summary><p className="mt-2 text-xs leading-5 text-violet-900">{providerEligibility.join(" · ")}</p></details></section> : null}
      {scope !== "sync_my_reports" && parameterDefinitions.length ? <details className="rounded-xl border border-slate-200 px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-slate-700">Advanced parameter JSON <ChevronDown className="h-4 w-4" /></summary><p className="mt-2 text-xs leading-5 text-slate-500">The portal validates structured controls. This view helps authorized users review the resulting request data.</p><pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">{JSON.stringify(parameterValues, null, 2)}</pre></details> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">{selectedReport && scope !== "sync_my_reports" ? <Button type="button" variant="outline" onClick={saveCurrentDefaults} disabled={outsideWorkHours || saveDefaults.isPending} className="border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100">{saveDefaults.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{savedDefaults.data ? "Update report setup" : "Save report setup"}</Button> : null}<Button onClick={validateDraft} disabled={outsideWorkHours || mutation.isPending || (scope === "generate_property" && !propertyId) || (scope !== "sync_my_reports" && !parameterDefinitions.length)} className="bg-[#0b8775] hover:bg-[#087365]">{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Review & authorize {source} run</Button><p className="text-xs text-slate-500">The local source runner can claim this request only after the final portal confirmation and its secure Edge health check.</p></div>
    </div></section>
    <aside className="space-y-4"><div className="rounded-2xl border border-[#bfe9db] bg-[#effaf7] p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#087365]" /><div><p className="text-sm font-semibold text-[#063e36]">Scoped, traceable request</p><p className="mt-2 text-xs leading-5 text-[#356e65]">The request records the source, exact report title, export format, selected scope, property context, and supported parameters for the runner.</p></div></div></div><div className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-5"><div className="flex items-start gap-3"><Info className="mt-0.5 h-4 w-4 text-amber-700" /><div><p className="text-sm font-semibold text-amber-950">My Reports retrieval</p><p className="mt-2 text-xs leading-5 text-amber-900/80">The runner files provider-generated outputs only after it can verify their source and property association.</p></div></div></div></aside>
    </div><Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Authorize this provider run?</DialogTitle><DialogDescription>Your confirmation will create a tracked request that the authorized local {source} Edge runner may claim. It does not bypass provider sign-in, MFA, or provider controls.</DialogDescription></DialogHeader><div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p><strong>Report:</strong> {selectedReport?.exactReportName ?? "My Reports discovery"}</p><p><strong>Output:</strong> {format?.toUpperCase() ?? "Not captured"}</p><p><strong>Scope:</strong> {scope === "generate_all_properties" ? `All ${properties.length} active portal properties` : scope === "generate_property" ? properties.find(property => property.id === Number(propertyId))?.name ?? "Selected property" : "My Reports discovery"}</p>{Object.keys(validatedParameters).length ? <pre className="max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(validatedParameters, null, 2)}</pre> : <p><strong>Parameters:</strong> No additional provider parameters.</p>}<p className="text-xs text-slate-600">No external email, internal notification, or cloud delivery will be used.</p></div><DialogFooter><Button type="button" variant="outline" onClick={() => setConfirmationOpen(false)}>Cancel</Button><Button type="button" disabled={mutation.isPending || !format} onClick={confirmAndAuthorize} className="bg-[#0b8775] hover:bg-[#087365]">{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Authorize & run in {source}</Button></DialogFooter></DialogContent></Dialog>
  </DashboardLayout>;
}

function ParameterFields({ definitions, values, onChange }: { definitions: ParameterDefinition[]; values: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  return <div className="mt-4 grid gap-4 sm:grid-cols-2">{definitions.map(definition => {
    const rawValue = values[definition.key];
    const stringValue = typeof rawValue === "string" ? rawValue : "";
    const inputValue = typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : "";
    return <div key={definition.key} className={definition.type === "boolean" ? "flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/80 p-3.5 sm:mt-6" : ""}>{definition.type === "boolean" ? <><input id={definition.key} type="checkbox" checked={Boolean(rawValue)} onChange={event => onChange(definition.key, event.target.checked)} className="mt-0.5 h-5 w-5 rounded border-violet-400 accent-violet-600 focus:ring-2 focus:ring-violet-500/30" /><div><Label htmlFor={definition.key} className="cursor-pointer text-slate-800">{definition.label}{definition.required ? <span className="text-rose-600"> *</span> : null}</Label><span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-violet-700">Toggle</span>{definition.description ? <p className="mt-1 text-xs leading-5 text-slate-600">{definition.description}</p> : null}</div></> : <div className="w-full"><Label htmlFor={definition.key} className="flex items-center gap-2">{definition.label}{definition.required ? <span className="text-rose-600"> *</span> : null}<span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-violet-700">Edit</span></Label>{definition.type === "select" ? <select id={definition.key} value={stringValue} onChange={event => onChange(definition.key, event.target.value)} className={`mt-1.5 h-11 w-full rounded-lg px-3 text-sm font-medium outline-none ${editableFieldClass}`}><option value="">Select an option</option>{definition.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <Input id={definition.key} type={definition.type === "number" ? "number" : definition.type === "date" ? "date" : "text"} value={inputValue} onChange={event => onChange(definition.key, definition.type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value)} className={`mt-1.5 h-11 ${editableFieldClass}`} />}{definition.description ? <p className="mt-1 text-xs leading-5 text-slate-600">{definition.description}</p> : null}</div>}</div>;
  })}</div>;
}
