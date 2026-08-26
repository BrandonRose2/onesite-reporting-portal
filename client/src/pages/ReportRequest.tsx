import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/portal/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Info, Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type Scope = "generate_all_properties" | "generate_property" | "sync_my_reports";

export default function ReportRequest({ source = "OneSite" }: { source?: "OneSite" | "Yardi" }) {
  const [, setLocation] = useLocation();
  const { data: catalog = [], isLoading: loadingCatalog } = trpc.catalog.list.useQuery();
  const { data: properties = [] } = trpc.properties.list.useQuery();
  const [scope, setScope] = useState<Scope>("generate_all_properties");
  const [catalogId, setCatalogId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [format, setFormat] = useState<"excel" | "pdf" | "csv">("excel");
  const [parametersText, setParametersText] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const mutation = trpc.requests.create.useMutation({ onSuccess: () => setLocation("/library") });
  const selectedReport = useMemo(() => catalog.find(item => item.id === Number(catalogId)), [catalog, catalogId]);

  const submit = () => {
    if (!selectedReport && scope !== "sync_my_reports") { setError("Select an approved report from the catalog before submitting."); return; }
    let reportParameters: Record<string, unknown>;
    try { reportParameters = JSON.parse(parametersText) as Record<string, unknown>; } catch { setError("Advanced parameters must be valid JSON, for example {}."); return; }
    setError(null);
    mutation.mutate({
      requestType: scope,
      requestedReportName: selectedReport?.exactReportName ?? "My Reports discovery",
      requestedFormat: format,
      propertyId: scope === "generate_property" ? Number(propertyId) : undefined,
      parameters: selectedReport ? {
        exactReportName: selectedReport.exactReportName,
        reportArea: selectedReport.reportArea ?? undefined,
        reportLevel: selectedReport.reportLevel ?? undefined,
        product: selectedReport.product ?? undefined,
        generationSettings: { reportParameters },
        ...selectedReport.runnerMetadata,
      } : { generationSettings: { reportParameters } },
    });
  };

  return <DashboardLayout><PageHeader eyebrow={`Pull Reports / ${source}`} title={`Request a ${source} report`} description="Create a traceable request for the recovered runner. Report credentials and browser session data remain outside this portal." />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)] sm:p-7"><div className="space-y-7">
      <fieldset><legend className="text-sm font-semibold text-slate-950">1. Select report scope</legend><div className="mt-3 grid gap-3 sm:grid-cols-3">{([{ value: "generate_all_properties", title: "All active properties", description: "Queue the selected report for every active portal property." }, { value: "generate_property", title: "One property", description: "Run only against a selected active property." }, { value: "sync_my_reports", title: "My Reports discovery", description: "Preserve a discovery request with a known limitation warning." }] as Array<{ value: Scope; title: string; description: string }>).map(option => <label key={option.value} className={`cursor-pointer rounded-xl border p-4 transition-colors ${scope === option.value ? "border-[#0b8775] bg-[#f0fbf8]" : "border-slate-200 hover:border-slate-300"}`}><input className="sr-only" type="radio" name="scope" checked={scope === option.value} onChange={() => setScope(option.value)} /><span className="block text-sm font-semibold text-slate-900">{option.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span></label>)}</div></fieldset>
      {scope !== "sync_my_reports" ? <fieldset><legend className="text-sm font-semibold text-slate-950">2. Select an approved report</legend><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="report">Report catalog</Label><select id="report" value={catalogId} onChange={event => { setCatalogId(event.target.value); setFormat("excel"); }} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0b8775] focus:ring-2 focus:ring-[#0b8775]/15"><option value="">{loadingCatalog ? "Loading approved reports…" : "Select a report"}</option>{catalog.map(item => <option key={item.id} value={item.id}>{item.exactReportName}</option>)}</select></div><div><Label>Allowed formats</Label><div className="mt-1.5 flex h-10 gap-2">{(["excel", "pdf", "csv"] as const).map(item => <button key={item} disabled={!selectedReport?.availableFormats.includes(item)} onClick={() => setFormat(item)} type="button" className={`rounded-lg border px-3 text-xs font-semibold capitalize transition-colors ${format === item ? "border-[#0b8775] bg-[#e7f8f2] text-[#087365]" : "border-slate-200 text-slate-500"} disabled:cursor-not-allowed disabled:opacity-40`}>{item}</button>)}</div></div></div>
        {selectedReport ? <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Runner metadata:</span> exact name <span className="font-mono text-[11px]">{selectedReport.exactReportName}</span>{selectedReport.reportArea ? ` · ${selectedReport.reportArea}` : ""}{selectedReport.product ? ` · ${selectedReport.product}` : ""}</div> : null}</fieldset> : null}
      {scope === "generate_property" ? <fieldset><legend className="text-sm font-semibold text-slate-950">3. Select property</legend><div className="mt-3 max-w-md"><Label htmlFor="property">Active property</Label><select id="property" value={propertyId} onChange={event => setPropertyId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0b8775] focus:ring-2 focus:ring-[#0b8775]/15"><option value="">Select a property</option>{properties.map(property => <option key={property.id} value={property.id}>{property.name}{property.market ? ` · ${property.market}` : ""}</option>)}</select></div></fieldset> : null}
      <fieldset><legend className="text-sm font-semibold text-slate-950">{scope === "generate_property" ? "4" : "3"}. Optional report parameters</legend><p className="mt-1 text-xs leading-5 text-slate-500">Use this field only for report parameters the preserved runner understands. Leave as an empty object when none are needed.</p><Textarea value={parametersText} onChange={event => setParametersText(event.target.value)} className="mt-3 min-h-28 font-mono text-xs" spellCheck={false} /></fieldset>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5"><Button onClick={submit} disabled={mutation.isPending || (scope === "generate_property" && !propertyId)} className="bg-[#0b8775] hover:bg-[#087365]">{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Queue report request</Button><p className="text-xs text-slate-500">Submission creates an auditable queued request. The runner claims it only after its own secure health and session checks.</p></div>
    </div></section>
    <aside className="space-y-4"><div className="rounded-2xl border border-[#bfe9db] bg-[#effaf7] p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#087365]" /><div><p className="text-sm font-semibold text-[#063e36]">Runner-safe request capture</p><p className="mt-2 text-xs leading-5 text-[#356e65]">The request retains the exact report name, catalog metadata, selected format, property scope, and parameters required by the preserved runner.</p></div></div></div><div className="rounded-2xl border border-amber-200 bg-[#fffaf0] p-5"><div className="flex items-start gap-3"><Info className="mt-0.5 h-4 w-4 text-amber-700" /><div><p className="text-sm font-semibold text-amber-950">My Reports limitation</p><p className="mt-2 text-xs leading-5 text-amber-900/80">The discovery path is saved for visibility, but it remains intentionally unverified. A request will return with a warning rather than fabricated files.</p></div></div></div></aside>
    </div>
  </DashboardLayout>;
}

