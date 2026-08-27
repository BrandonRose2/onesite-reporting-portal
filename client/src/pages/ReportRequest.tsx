import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/portal/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ChevronDown, Info, Loader2, Search, Send, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState, type WheelEvent } from "react";
import { useLocation } from "wouter";

type Scope = "generate_all_properties" | "generate_property" | "sync_my_reports";
type ParameterDefinition = { key: string; label: string; type: "text" | "number" | "select" | "boolean" | "date"; required?: boolean; description?: string; options?: Array<{ label: string; value: string }>; defaultValue?: string | number | boolean };

const editableFieldClass = "border-emerald-300 bg-[#effaf6] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,.8)] transition-colors hover:border-[#0b8775] hover:bg-[#e6f7f0] focus:border-[#087365] focus:bg-white focus:ring-2 focus:ring-[#0b8775]/25";

function getParameterDefinitions(metadata: Record<string, unknown>): ParameterDefinition[] {
  const raw = metadata.parameterDefinitions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is ParameterDefinition => Boolean(item) && typeof item === "object" && typeof (item as ParameterDefinition).key === "string" && typeof (item as ParameterDefinition).label === "string" && ["text", "number", "select", "boolean", "date"].includes((item as ParameterDefinition).type));
}

function defaultsFor(definitions: ParameterDefinition[]) {
  return Object.fromEntries(definitions.filter(definition => definition.defaultValue !== undefined).map(definition => [definition.key, definition.defaultValue])) as Record<string, unknown>;
}

function normalizedSearchTerms(value: string) {
  const aliases: Record<string, string> = { delinquency: "delinquent", delinquent: "delinquent" };
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).map(term => aliases[term] ?? term);
}

export default function ReportRequest({ source = "OneSite" }: { source?: "OneSite" | "Yardi" }) {
  const [, setLocation] = useLocation();
  const runnerSource = source === "Yardi" ? "yardi" as const : "onesite" as const;
  const { data: catalog = [], isLoading: loadingCatalog } = trpc.catalog.list.useQuery({ source: runnerSource });
  const { data: properties = [] } = trpc.properties.list.useQuery({ includeInactive: false });
  const [scope, setScope] = useState<Scope>("generate_all_properties");
  const [catalogId, setCatalogId] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [format, setFormat] = useState<"excel" | "pdf" | "csv">("excel");
  const [parameterValues, setParameterValues] = useState<Record<string, unknown>>({});
  const [advancedParametersText, setAdvancedParametersText] = useState("{}");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = trpc.requests.create.useMutation({ onSuccess: () => setLocation("/library") });
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

  useEffect(() => {
    if (!selectedReport) { setParameterValues({}); setAdvancedParametersText("{}"); return; }
    setFormat(selectedReport.availableFormats[0] ?? "excel");
    const defaults = defaultsFor(getParameterDefinitions(selectedReport.runnerMetadata));
    setParameterValues(defaults);
    setAdvancedParametersText(JSON.stringify(defaults, null, 2));
  }, [selectedReport]);

  const submit = () => {
    if (!selectedReport && scope !== "sync_my_reports") { setError("Select an approved report from the source catalog before submitting."); return; }
    let reportParameters = parameterValues;
    if (!parameterDefinitions.length && scope !== "sync_my_reports") {
      try { reportParameters = JSON.parse(advancedParametersText) as Record<string, unknown>; } catch { setError("Advanced parameters must be valid JSON, for example {}."); return; }
    }
    setError(null);
    mutation.mutate({
      source: runnerSource,
      requestType: scope,
      catalogId: selectedReport?.id,
      requestedReportName: selectedReport?.exactReportName ?? "My Reports discovery",
      requestedFormat: format,
      propertyId: scope === "generate_property" ? Number(propertyId) : undefined,
      parameters: reportParameters,
    });
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)] sm:p-7"><div className="space-y-7">
      <fieldset><legend className="text-sm font-semibold text-slate-950">1. Select report scope</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{([{ value: "generate_all_properties", title: "All active properties", description: "Run the configured report against every active portal property." }, { value: "generate_property", title: "Selected property", description: "Run only against one active property you select." }, { value: "sync_my_reports", title: "My Reports retrieval", description: "Retrieve provider-generated outputs that the runner can safely match and file." }] as Array<{ value: Scope; title: string; description: string }>).map(option => <label key={option.value} className={`cursor-pointer rounded-xl border p-4 transition-colors ${scope === option.value ? "border-[#0b8775] bg-[#f0fbf8]" : "border-slate-200 hover:border-slate-300"}`}><input className="sr-only" type="radio" name="scope" checked={scope === option.value} onChange={() => { setScope(option.value); setError(null); }} /><span className="block text-sm font-semibold text-slate-900">{option.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span></label>)}</div></fieldset>
      {scope !== "sync_my_reports" ? <fieldset><legend className="flex items-center gap-2 text-sm font-semibold text-slate-950">2. Select an approved {source} report <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087365]">Choose</span></legend><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="report-search" className="flex items-center justify-between gap-2">Report title <span className="text-[11px] font-medium text-[#087365]">{loadingCatalog ? "Syncing…" : `${catalog.length} active reports`}</span></Label><div className="relative mt-1.5"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#087365]" /><Input id="report-search" value={reportSearch} onFocus={() => setPickerOpen(true)} onChange={event => { setReportSearch(event.target.value); setPickerOpen(true); }} onKeyDown={event => { if (event.key === "Escape") setPickerOpen(false); }} placeholder={`Search ${source} report titles`} className={`h-11 pl-9 text-sm ${editableFieldClass}`} aria-controls="report-results" aria-expanded={pickerOpen} /><button type="button" onClick={() => setPickerOpen(open => !open)} className={`mt-2 flex h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium outline-none ${editableFieldClass}`}><span className="truncate">{selectedReport?.exactReportName ?? (loadingCatalog ? "Loading approved reports…" : `Select a ${source} report`)}</span><ChevronDown className={`h-4 w-4 shrink-0 text-[#087365] transition-transform ${pickerOpen ? "rotate-180" : ""}`} /></button>{pickerOpen ? <div id="report-results" role="listbox" aria-label={`${source} report results`} onWheel={controlPickerWheel} className="absolute z-20 mt-1 max-h-72 w-full snap-y snap-proximity overscroll-contain overflow-y-auto rounded-xl border border-emerald-300 bg-white p-1 shadow-xl shadow-emerald-950/10">{filteredCatalog.length ? filteredCatalog.map(item => <button key={item.id} type="button" role="option" aria-selected={selectedReport?.id === item.id} onClick={() => { setCatalogId(String(item.id)); setPickerOpen(false); setError(null); }} className={`flex w-full snap-start rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${selectedReport?.id === item.id ? "bg-[#dff5ec] text-[#063e36]" : "hover:bg-[#effaf6]"}`}>{item.exactReportName}</button>) : <p className="px-3 py-4 text-sm text-slate-500">No report titles match “{reportSearch}”.</p>}</div> : null}</div><p className="mt-2 text-xs text-[#356e65]">{filteredCatalog.length} matching title{filteredCatalog.length === 1 ? "" : "s"}.</p></div><div><Label>Allowed formats</Label><div className="mt-1.5 flex h-11 gap-2">{(["excel", "pdf", "csv"] as const).map(item => <button key={item} disabled={!selectedReport?.availableFormats.includes(item)} onClick={() => setFormat(item)} type="button" className={`rounded-lg border px-3 text-xs font-semibold capitalize transition-colors ${format === item ? "border-[#0b8775] bg-[#dff5ec] text-[#087365] shadow-sm" : "border-emerald-200 bg-emerald-50/70 text-slate-500 hover:border-emerald-300"} disabled:cursor-not-allowed disabled:opacity-40`}>{item}</button>)}</div></div></div></fieldset> : null}
      {scope === "generate_property" ? <fieldset><legend className="flex items-center gap-2 text-sm font-semibold text-slate-950">3. Select property <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087365]">Choose</span></legend><div className="mt-3 max-w-md"><Label htmlFor="property">Active property</Label><select id="property" value={propertyId} onChange={event => setPropertyId(event.target.value)} className={`mt-1.5 h-11 w-full rounded-lg px-3 text-sm font-medium outline-none ${editableFieldClass}`}><option value="">Select a property</option>{properties.map(property => <option key={property.id} value={property.id}>{property.name}{property.market ? ` · ${property.market}` : ""}</option>)}</select><p className="mt-1.5 text-xs text-[#356e65]">This green selector changes the report scope to one property only.</p></div></fieldset> : null}
      {scope !== "sync_my_reports" ? <fieldset><legend className="flex items-center gap-2 text-sm font-semibold text-slate-950"><SlidersHorizontal className="h-4 w-4 text-[#087365]" />{step}. Configure report parameters</legend>{selectedReport ? parameterDefinitions.length ? <><p className="mt-1 text-xs leading-5 text-slate-500">These controls reflect the approved parameter model captured for this {source} report.</p><ParameterFields definitions={parameterDefinitions} values={parameterValues} onChange={(key, value) => setParameterValues(current => ({ ...current, [key]: value }))} /></> : <><p className="mt-1 text-xs leading-5 text-slate-500">This catalog item does not yet have a structured parameter model. Use only runner-supported JSON settings.</p><Textarea value={advancedParametersText} onChange={event => setAdvancedParametersText(event.target.value)} className="mt-3 min-h-28 font-mono text-xs" spellCheck={false} /></> : <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">Choose a report to load its approved parameter controls.</div>}</fieldset> : null}
      {scope !== "sync_my_reports" && parameterDefinitions.length ? <details className="rounded-xl border border-slate-200 px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-slate-700">Advanced parameter JSON <ChevronDown className="h-4 w-4" /></summary><p className="mt-2 text-xs leading-5 text-slate-500">The portal validates structured controls. This view helps authorized users review the resulting request data.</p><pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">{JSON.stringify(parameterValues, null, 2)}</pre></details> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5"><Button onClick={submit} disabled={mutation.isPending || (scope === "generate_property" && !propertyId)} className="bg-[#0b8775] hover:bg-[#087365]">{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Queue report request</Button><p className="text-xs text-slate-500">The matching source runner can claim this request only after its secure session and health checks pass.</p></div>
    </div></section>
    <aside className="space-y-4"><div className="rounded-2xl border border-[#bfe9db] bg-[#effaf7] p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#087365]" /><div><p className="text-sm font-semibold text-[#063e36]">Scoped, traceable request</p><p className="mt-2 text-xs leading-5 text-[#356e65]">The request records the source, exact report title, export format, selected scope, property context, and supported parameters for the runner.</p></div></div></div><div className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-5"><div className="flex items-start gap-3"><Info className="mt-0.5 h-4 w-4 text-amber-700" /><div><p className="text-sm font-semibold text-amber-950">My Reports retrieval</p><p className="mt-2 text-xs leading-5 text-amber-900/80">The runner files provider-generated outputs only after it can verify their source and property association.</p></div></div></div></aside>
    </div>
  </DashboardLayout>;
}

function ParameterFields({ definitions, values, onChange }: { definitions: ParameterDefinition[]; values: Record<string, unknown>; onChange: (key: string, value: unknown) => void }) {
  return <div className="mt-4 grid gap-4 sm:grid-cols-2">{definitions.map(definition => {
    const rawValue = values[definition.key];
    const stringValue = typeof rawValue === "string" ? rawValue : "";
    const inputValue = typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : "";
    return <div key={definition.key} className={definition.type === "boolean" ? "flex items-start gap-3 rounded-xl border border-emerald-200 bg-[#effaf6] p-3.5 sm:mt-6" : ""}>{definition.type === "boolean" ? <><input id={definition.key} type="checkbox" checked={Boolean(rawValue)} onChange={event => onChange(definition.key, event.target.checked)} className="mt-0.5 h-5 w-5 rounded border-emerald-400 accent-[#0b8775] focus:ring-2 focus:ring-[#0b8775]/30" /><div><Label htmlFor={definition.key} className="cursor-pointer text-slate-800">{definition.label}{definition.required ? <span className="text-rose-600"> *</span> : null}</Label><span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#087365]">Toggle</span>{definition.description ? <p className="mt-1 text-xs leading-5 text-[#356e65]">{definition.description}</p> : null}</div></> : <div className="w-full"><Label htmlFor={definition.key} className="flex items-center gap-2">{definition.label}{definition.required ? <span className="text-rose-600"> *</span> : null}<span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#087365]">Edit</span></Label>{definition.type === "select" ? <select id={definition.key} value={stringValue} onChange={event => onChange(definition.key, event.target.value)} className={`mt-1.5 h-11 w-full rounded-lg px-3 text-sm font-medium outline-none ${editableFieldClass}`}><option value="">Select an option</option>{definition.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <Input id={definition.key} type={definition.type === "number" ? "number" : definition.type === "date" ? "date" : "text"} value={inputValue} onChange={event => onChange(definition.key, definition.type === "number" && event.target.value !== "" ? Number(event.target.value) : event.target.value)} className={`mt-1.5 h-11 ${editableFieldClass}`} />}{definition.description ? <p className="mt-1 text-xs leading-5 text-[#356e65]">{definition.description}</p> : null}</div>}</div>;
  })}</div>;
}
