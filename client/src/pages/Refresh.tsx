import { Panel } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, FileSpreadsheet, Loader2, LockKeyhole, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const readBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});
const isDelinquencySourceFile = (filename: string) => /delinquent and prepaid/i.test(filename) && /\.xls(x)?$/i.test(filename);
const displaySourceFilename = (filename: string) => filename.replace(/delinquent\s+and\s+prepaid/gi, "Delinquency");

function WorkflowStep({ number, title, detail, active, complete }: { number: number; title: string; detail: string; active?: boolean; complete?: boolean }) {
  return <div className={`flex gap-3 rounded-xl border p-3 ${active ? "border-[#8cc8bf] bg-[#f1faf7]" : "border-slate-200 bg-white"}`}>
    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${complete ? "bg-[#0c7469] text-white" : active ? "bg-[#dff2ec] text-[#0c7469]" : "bg-slate-100 text-slate-500"}`}>{complete ? "✓" : number}</span>
    <div><p className="text-sm font-semibold text-[#122b4b]">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-600">{detail}</p></div>
  </div>;
}

export default function Refresh() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("Fiscal Period 04/2026 · 08/05/2026");
  const [fiscalPeriod, setFiscalPeriod] = useState("04/2026");
  const [asOfDate, setAsOfDate] = useState("2026-08-05");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preparedCount, setPreparedCount] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [completedImport, setCompletedImport] = useState<{ reportingPeriodId: number; sourceFileCount: number } | null>(null);
  const validFiles = useMemo(() => files.filter(file => isDelinquencySourceFile(file.name)), [files]);
  const batchReady = files.length > 0 && validFiles.length === files.length && files.length <= 35;
  const mutation = trpc.delinquency.importBatch.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.delinquency.periods.invalidate(), utils.delinquency.dashboard.invalidate()]);
      setCompletedImport(result);
    },
    onError: err => setError(err.message),
  });
  const chooseFiles = (fileList: FileList | null) => {
    const next = Array.from(fileList ?? []);
    setFiles(next);
    setError(next.length > 35 ? "A reporting-period batch may contain no more than 35 XLS files." : null);
  };
  const submit = async () => {
    setError(null);
    if (!name.trim() || !fiscalPeriod.trim() || !asOfDate) return setError("Complete the snapshot name, fiscal period, and as-of date first.");
    if (!files.length) return setError("Choose the Delinquency XLS exports for this reporting period.");
    if (files.length > 35) return setError("Select no more than 35 files per batch.");
    if (validFiles.length !== files.length) return setError("Every selected file must be a Delinquency XLS export.");
    try {
      setPreparing(true); setPreparedCount(0);
      const payload = [];
      for (const file of files) {
        payload.push({ filename: file.name, dataBase64: await readBase64(file) });
        setPreparedCount(payload.length);
      }
      mutation.mutate({ name: name.trim(), fiscalPeriod: fiscalPeriod.trim(), asOfDate, files: payload }, { onSettled: () => setPreparing(false) });
    } catch {
      setPreparing(false);
      setError("One or more files could not be prepared for import. Please choose the XLS exports again.");
    }
  };

  if (preparing || mutation.isPending) return <section className="grid min-h-[58vh] place-items-center rounded-[1.5rem] bg-[#122b4b] p-8 text-center text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)]"><div className="w-full max-w-md"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-[#a9d8d1]"><Loader2 className="h-7 w-7 animate-spin" /></div><p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">Run Scraper</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{preparing ? "Preparing source reports" : "Creating reporting-period snapshot"}</h1><p className="mt-3 text-sm leading-6 text-slate-200">{preparing ? `Preparing report ${preparedCount} of ${files.length} for secure upload.` : "Archiving source files, parsing current-resident ledger detail, and calculating the reporting-period summary."}</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#a9d8d1] transition-[width] duration-200" style={{ width: `${preparing ? (files.length ? preparedCount / files.length * 100 : 0) : 100}%` }} /></div><p className="mt-3 text-xs text-slate-300">Source identifiers, import timestamps, and file traceability will be preserved with this snapshot.</p></div></section>;
  if (completedImport) return <section className="grid min-h-[58vh] place-items-center rounded-[1.5rem] border border-[#9acdbf] bg-[#f2fbf7] p-8 text-center shadow-[0_18px_50px_rgba(16,37,63,0.08)]"><div className="w-full max-w-xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#0c7469] text-white"><CheckCircle2 className="h-7 w-7" /></div><p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0c7469]">Import complete</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#122b4b]">Reporting-period snapshot created</h1><p className="mt-3 text-sm leading-6 text-slate-600">{completedImport.sourceFileCount} source {completedImport.sourceFileCount === 1 ? "file was" : "files were"} archived for <strong>{name}</strong>. The snapshot is ready for reporting, comparison, and source-document review.</p><div className="mt-6 grid gap-3 text-left sm:grid-cols-3"><div className="rounded-xl border border-[#cce7df] bg-white p-4"><p className="text-xs text-slate-500">Snapshot</p><p className="mt-1 text-sm font-semibold text-[#122b4b]">{fiscalPeriod}</p></div><div className="rounded-xl border border-[#cce7df] bg-white p-4"><p className="text-xs text-slate-500">As of</p><p className="mt-1 text-sm font-semibold text-[#122b4b]">{asOfDate}</p></div><div className="rounded-xl border border-[#cce7df] bg-white p-4"><p className="text-xs text-slate-500">Archived sources</p><p className="mt-1 text-sm font-semibold text-[#122b4b]">{completedImport.sourceFileCount}</p></div></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={() => setLocation("/history")} className="hunter-metal-button"><FileSpreadsheet className="mr-2 h-4 w-4" />View reporting history</Button><Button variant="outline" onClick={() => setLocation("/")} className="border-[#0c7469] text-[#0c7469] hover:bg-[#eaf5f3]">Open reporting home<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div></section>;
  if (user?.role !== "admin") return <section className="grid min-h-[58vh] place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center"><div className="max-w-md"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff8e7] text-[#b7791f]"><LockKeyhole className="h-7 w-7" /></div><h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#122b4b]">Administrator access is required.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Only administrators can create reporting periods or upload resident-level XLS data. Contact an administrator to run the next source-data refresh.</p></div></section>;

  return <div className="space-y-6"><section><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0c7469]">Source ingestion</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] text-[#122b4b]">Run Scraper</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Create an immutable reporting-period snapshot from the latest current-resident Delinquency XLS exports. Follow the same three-step path every time: identify the period, add the source batch, then create the snapshot.</p></section><section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]"><Panel eyebrow="New reporting period" title="Import source batch"><div className="space-y-6 p-5 sm:p-6"><div className="grid gap-3 sm:grid-cols-3"><WorkflowStep number={1} title="Name the period" detail="Set reporting dates" active={!files.length} complete={Boolean(name && fiscalPeriod && asOfDate)} /><WorkflowStep number={2} title="Choose XLS files" detail="Add current-resident exports" active={files.length > 0 && !batchReady} complete={batchReady} /><WorkflowStep number={3} title="Create snapshot" detail="Archive and calculate" active={batchReady} /></div><section className="space-y-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#166249]">Step 1 · Name the reporting period</p><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="period-name">Snapshot name</Label><Input id="period-name" value={name} onChange={event => setName(event.target.value)} className="mt-2" /></div><div><Label htmlFor="fiscal-period">Fiscal period</Label><Input id="fiscal-period" value={fiscalPeriod} onChange={event => setFiscalPeriod(event.target.value)} className="mt-2" /></div><div><Label htmlFor="as-of-date">As-of date</Label><Input id="as-of-date" type="date" value={asOfDate} onChange={event => setAsOfDate(event.target.value)} className="mt-2" /></div></div></section><section><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#166249]">Step 2 · Choose source reports</p><Label htmlFor="xls-batch" className="mt-2 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#8cc8bf] bg-[#f5fbfa] px-5 text-center transition-colors hover:bg-[#ebf7f4]"><UploadCloud className="h-7 w-7 text-[#0c7469]" /><p className="mt-3 text-sm font-semibold text-[#122b4b]">Choose up to 35 Delinquency XLS reports</p><p className="mt-1 text-xs leading-5 text-slate-500">Use one current-resident export for each available entity. The source files will remain attached to this snapshot.</p><input id="xls-batch" className="sr-only" type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple onChange={event => chooseFiles(event.target.files)} /></Label></section>{files.length ? <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#122b4b]">{files.length} source {files.length === 1 ? "file" : "files"} selected</p><p className="mt-1 text-xs text-slate-500">{validFiles.length} recognized Delinquency export{validFiles.length === 1 ? "" : "s"} · portfolio target: up to 35 files</p></div><Badge className={batchReady ? "bg-[#eaf5f3] text-[#0c7469] hover:bg-[#eaf5f3]" : "bg-[#fff1f2] text-[#b44851] hover:bg-[#fff1f2]"}>{batchReady ? "Ready for snapshot" : "Review filenames"}</Badge></div><div className="mt-3 max-h-40 space-y-1 overflow-y-auto pr-2">{files.map(file => <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-xs text-slate-600"><FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[#39729f]" /><span className="truncate">{displaySourceFilename(file.name)}</span></div>)}</div></div> : null}{error ? <div className="flex gap-2 rounded-xl border border-[#f0c7c9] bg-[#fff4f4] p-3 text-sm text-[#9d3740]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}<section className="rounded-xl border border-[#9acdbf] bg-[#edf9f4] p-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#166249]">Step 3 · Create snapshot</p><p className="mt-1 text-sm font-semibold text-[#122b4b]">Archive the source batch and refresh reporting history</p><p className="mt-1 text-xs leading-5 text-slate-600">The portal validates each selected report, preserves its source metadata, and creates a named period for later review and comparison.</p><Button disabled={!batchReady || mutation.isPending} onClick={submit} className="hunter-metal-button mt-4 w-full">{mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}{mutation.isPending ? "Creating reporting period…" : "Create reporting-period snapshot"}<ChevronRight className="ml-2 h-4 w-4" /></Button></section></div></Panel><Panel eyebrow="Import safeguards" title="What this run preserves"><div className="space-y-4 p-5 sm:p-6"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0c7469]" /><p className="text-sm leading-5 text-slate-600">Every source XLS is retained in secure file storage with its property ID, checksum, and import timestamp.</p></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0c7469]" /><p className="text-sm leading-5 text-slate-600">A named snapshot preserves current reporting history; ready periods are never overwritten.</p></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0c7469]" /><p className="text-sm leading-5 text-slate-600">Use the progress screen to confirm preparation and archival before returning to the updated reporting workspace.</p></div></div></Panel></section></div>;
}
