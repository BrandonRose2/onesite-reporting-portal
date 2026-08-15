import { useAuth } from "@/_core/hooks/useAuth";
import { Panel } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, Play, Settings2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Parameters = {
  delinquencyReportName: "Delinquency (Current Residents)";
  delinquencyFormat: "excel";
  includeAvailabilityPdf: boolean;
  includeZeroBalance: boolean;
  residentScope: "current_residents_only";
  propertyScope: "mapped_realpage";
};

const defaultParameters: Parameters = {
  delinquencyReportName: "Delinquency (Current Residents)",
  delinquencyFormat: "excel",
  includeAvailabilityPdf: true,
  includeZeroBalance: false,
  residentScope: "current_residents_only",
  propertyScope: "mapped_realpage",
};

const statusLabel = (status: string) => status.replaceAll("_", " ");

export default function AutomationSettings() {
  const { user, loading } = useAuth();
  const configQuery = trpc.delinquency.automation.get.useQuery(undefined, { enabled: user?.role === "admin" });
  const runsQuery = trpc.delinquency.automation.runs.useQuery(undefined, { enabled: user?.role === "admin" });
  const utils = trpc.useUtils();
  const save = trpc.delinquency.automation.save.useMutation({ onSuccess: () => { toast.success("Automation settings saved."); utils.delinquency.automation.get.invalidate(); } });
  const queueRun = trpc.delinquency.automation.queueRun.useMutation({ onSuccess: () => { toast.success("RealPage run queued. Its summary will appear below as it advances."); utils.delinquency.automation.runs.invalidate(); } });
  const [cronExpression, setCronExpression] = useState("0 0 15 * * 1");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [isEnabled, setIsEnabled] = useState(false);
  const [parameters, setParameters] = useState<Parameters>(defaultParameters);

  useEffect(() => {
    if (!configQuery.data) return;
    setCronExpression(configQuery.data.cronExpression ?? "0 0 15 * * 1");
    setTimezone(configQuery.data.timezone);
    setIsEnabled(configQuery.data.isEnabled);
    setParameters({ ...defaultParameters, ...configQuery.data.parameters, delinquencyReportName: "Delinquency (Current Residents)", residentScope: "current_residents_only" });
  }, [configQuery.data]);

  if (loading) return <div className="h-72 animate-pulse rounded-[1.25rem] bg-slate-100" />;
  if (user?.role !== "admin") return <div className="grid min-h-80 place-items-center rounded-[1.25rem] border border-dashed bg-white p-8 text-center"><div><ShieldCheck className="mx-auto h-8 w-8 text-[#0c7469]" /><h1 className="mt-4 text-lg font-semibold text-[#122b4b]">Administrator access required</h1><p className="mt-2 max-w-md text-sm text-slate-600">Only portal administrators can edit automated retrieval settings and launch source-system runs.</p></div></div>;

  const submit = () => save.mutate({ cronExpression, timezone, isEnabled, parameters: { ...parameters, delinquencyReportName: "Delinquency (Current Residents)", residentScope: "current_residents_only" } });
  return <div className="mx-auto max-w-6xl space-y-6">
    <section className="rounded-[1.5rem] bg-[#122b4b] p-6 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">Administrator controls</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Automation Settings</h1><p className="mt-2 max-w-2xl text-sm text-slate-200">Control the RealPage Reports Hub schedule, establish repeatable report parameters, and retain an immutable operational record for every run.</p></div><Badge className="border border-white/15 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">Reports Hub connection</Badge></div></section>
    <section className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]"><Panel eyebrow="Schedule" title="Run timing and activation"><div className="space-y-5 p-5 sm:p-6"><div className="rounded-xl bg-[#f5fbfa] p-4 text-sm text-[#0c7469]"><p className="font-semibold">Monday 7:00 AM Pacific requested</p><p className="mt-1 text-xs leading-5 text-slate-600">The stored cron is in UTC. Activation occurs only after a trusted RealPage session profile is established for the approved runner.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="cron">UTC cron expression</Label><Input id="cron" value={cronExpression} onChange={event => setCronExpression(event.target.value)} /><p className="text-xs text-slate-500">Six fields: sec min hour day month weekday.</p></div><div className="space-y-2"><Label htmlFor="timezone">Display timezone</Label><Input id="timezone" value={timezone} onChange={event => setTimezone(event.target.value)} /></div></div><div className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><div><p className="text-sm font-semibold text-[#122b4b]">Enable scheduled retrieval</p><p className="mt-1 text-xs text-slate-500">Allow Monday runs after the browser session and deployed callback are validated.</p></div><Switch checked={isEnabled} onCheckedChange={setIsEnabled} /></div><Button onClick={submit} disabled={save.isPending} className="w-full bg-[#0c7469] hover:bg-[#095e56]"><Settings2 className="mr-2 h-4 w-4" />{save.isPending ? "Saving settings…" : "Save automation settings"}</Button></div></Panel><Panel eyebrow="Run now" title="On-demand collection"><div className="space-y-5 p-5 sm:p-6"><div className="rounded-xl border border-[#eed79d] bg-[#fffaf0] p-4 text-sm text-[#745116]"><p className="font-semibold">Run with the current saved parameters</p><p className="mt-1 text-xs leading-5">The run queues the current-residents-only Excel delinquency export and, when enabled, the Availability PDF for every mapped RealPage property.</p></div><Button onClick={() => queueRun.mutate()} disabled={queueRun.isPending || !configQuery.data?.id} className="w-full bg-[#17365d] hover:bg-[#122b4b]"><Play className="mr-2 h-4 w-4" />{queueRun.isPending ? "Queueing run…" : "Run scraper now"}</Button><p className="text-xs leading-5 text-slate-500">A queued run preserves its source system, parameters, source files, and validation results in the operational history.</p></div></Panel></section>
    <section className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]"><Panel eyebrow="Parameters" title="Reports Hub collection rules"><div className="space-y-4 p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Delinquency report</Label><div className="flex h-10 items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-600">Delinquency</div></div><div className="space-y-2"><Label>Resident scope</Label><div className="flex h-10 items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-600">Current residents only</div></div><div className="space-y-2"><Label>Delinquency format</Label><div className="flex h-10 items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-600">Excel</div></div><div className="space-y-2"><Label>Property scope</Label><div className="flex h-10 items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-600">Mapped RealPage properties</div></div></div><div className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-[#122b4b]">Archive Availability PDFs</p><p className="text-xs text-slate-500">Generate and attach one Availability PDF per mapped property.</p></div><Switch checked={parameters.includeAvailabilityPdf} onCheckedChange={value => setParameters({ ...parameters, includeAvailabilityPdf: value })} /></div><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-[#122b4b]">Include zero-balance accounts</p><p className="text-xs text-slate-500">Store current-resident zero balance rows when the source report provides them.</p></div><Switch checked={parameters.includeZeroBalance} onCheckedChange={value => setParameters({ ...parameters, includeZeroBalance: value })} /></div></div></div></Panel><Panel eyebrow="Operational history" title="Recent RealPage runs"><div className="divide-y divide-slate-100">{runsQuery.data?.length ? runsQuery.data.map(run => <div key={run.id} className="flex items-start justify-between gap-4 p-4"><div><div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{statusLabel(run.status)}</Badge><span className="text-xs text-slate-500">{run.trigger}</span></div><p className="mt-2 text-sm font-medium text-[#122b4b]">{new Date(run.startedAt).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{run.propertiesSucceeded}/{run.propertiesAttempted} properties · {run.documentsStored} documents · {run.ledgerRowsImported} rows</p></div><Clock3 className="h-4 w-4 text-slate-400" /></div>) : <div className="p-6 text-sm text-slate-500">No automated RealPage run has been recorded yet.</div>}</div></Panel></section>
    <div className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-[#0c7469]" />Every successful run will attach its archived Excel and PDF source documents plus validation summary to the created reporting period.</div>
  </div>;
}
