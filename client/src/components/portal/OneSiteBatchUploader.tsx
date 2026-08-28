import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type SelectedWorkbook = { id: string; file: File; propertyName: string };

function guessedProperty(filename: string, properties: string[]) {
  const normalized = filename.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return properties.find(property => normalized.includes(property.toLowerCase().replace(/[^a-z0-9]+/g, " "))) ?? "";
}

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.split(",", 2)[1];
      if (!base64) reject(new Error(`Could not read ${file.name}.`));
      else resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

export function OneSiteBatchUploader() {
  const utils = trpc.useUtils();
  const { data: plan, isLoading, error } = trpc.batchFiling.oneSite60001Plan.useQuery();
  const upload = trpc.batchFiling.uploadOneSite60001Workbook.useMutation();
  const [selected, setSelected] = useState<SelectedWorkbook[]>([]);
  const [progress, setProgress] = useState<{ completed: number; total: number; filed: string[]; errors: string[] } | null>(null);
  const availableProperties = plan?.pendingFiling ?? [];
  const canSubmit = selected.length > 0 && selected.every(item => item.propertyName) && new Set(selected.map(item => item.propertyName)).size === selected.length && !upload.isPending;
  const selectedPropertyNames = useMemo(() => new Set(selected.map(item => item.propertyName).filter(Boolean)), [selected]);

  const addFiles = (files: FileList | null) => {
    if (!files || !plan) return;
    const newFiles = Array.from(files).filter(file => /\.xls[x]?$/i.test(file.name));
    setSelected(current => [...current, ...newFiles.map((file, index) => ({ id: `${file.name}-${file.lastModified}-${index}`, file, propertyName: guessedProperty(file.name, plan.pendingFiling) }))]);
    setProgress(null);
  };

  const updateProperty = (id: string, propertyName: string) => setSelected(current => current.map(item => item.id === id ? { ...item, propertyName } : item));
  const remove = (id: string) => setSelected(current => current.filter(item => item.id !== id));
  const submit = async () => {
    if (!canSubmit) return;
    const outcome = { completed: 0, total: selected.length, filed: [] as string[], errors: [] as string[] };
    setProgress(outcome);
    for (const item of selected) {
      try {
        const dataBase64 = await readBase64(item.file);
        const result = await upload.mutateAsync({ propertyName: item.propertyName, originalFilename: item.file.name, dataBase64 });
        if (result.status === "filed") outcome.filed.push(result.propertyName);
      } catch (caught) {
        outcome.errors.push(`${item.propertyName || item.file.name}: ${caught instanceof Error ? caught.message : "Upload failed."}`);
      }
      outcome.completed += 1;
      setProgress({ ...outcome, filed: [...outcome.filed], errors: [...outcome.errors] });
    }
    await Promise.all([utils.batchFiling.oneSite60001Plan.invalidate(), utils.requests.details.invalidate({ id: 60001 }), utils.requests.library.invalidate(), utils.properties.details.invalidate()]);
    setSelected(current => current.filter(item => !outcome.filed.includes(item.propertyName)));
  };

  if (isLoading) return <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading the protected Request #60001 filing plan…</p></section>;
  if (error || !plan) return <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-sm font-semibold text-rose-900">The Request #60001 filing plan is unavailable.</p><p className="mt-1 text-xs leading-5 text-rose-700">{error?.message ?? "Reload this page before uploading any workbook."}</p></section>;

  return <section className="rounded-2xl border border-[#bfe9db] bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">Edge-only filing</p><h2 className="mt-1 text-lg font-semibold text-slate-950">File existing OneSite All Units workbooks</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Request #60001 has {plan.pendingFiling.length} completed workbooks still awaiting filing. Select the downloads from Microsoft Edge, match each to its property, and file them. This does not run or modify a OneSite report.</p></div><span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><FileSpreadsheet className="h-3.5 w-3.5" />{plan.alreadyFiled.length} pairs retained</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><StatusCard label="Ready to file" value={plan.pendingFiling.length} tone="teal" /><StatusCard label="Still in progress" value={plan.inProgress.join(" · ")} tone="amber" /><StatusCard label="Provider errors" value={plan.errored.join(" · ")} tone="rose" /></div>
    <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#bfe9db] bg-[#f4fbf9] px-5 py-7 text-center transition hover:border-[#0b8775] hover:bg-[#effaf7]"><Upload className="h-5 w-5 text-[#087365]" /><span className="mt-2 text-sm font-semibold text-[#063e36]">Choose completed .xls or .xlsx downloads</span><span className="mt-1 text-xs leading-5 text-[#4b6f69]">Only the 21 completed, unfiled Request #60001 properties are accepted. Original workbooks remain preserved, with a responsive HTML companion created automatically.</span><input className="sr-only" type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple onChange={event => addFiles(event.target.files)} /></label>
    {selected.length ? <div className="mt-5 space-y-3">{selected.map(item => <div key={item.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,.9fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.file.name}</p><p className="mt-1 text-xs text-slate-500">{Math.ceil(item.file.size / 1024).toLocaleString()} KB · Select its OneSite property before filing.</p></div><select value={item.propertyName} onChange={event => updateProperty(item.id, event.target.value)} className="h-10 w-full rounded-lg border border-[#d5bff0] bg-[#f6efff] px-3 text-sm text-slate-900 outline-none focus:border-[#8b5fc7] focus:ring-2 focus:ring-[#8b5fc7]/20"><option value="">Choose matching property</option>{availableProperties.map(property => <option key={property} value={property} disabled={selectedPropertyNames.has(property) && item.propertyName !== property}>{property}</option>)}</select><Button type="button" variant="ghost" size="sm" onClick={() => remove(item.id)} className="text-slate-600">Remove</Button></div>)}</div> : null}
    {selected.length && !canSubmit ? <p className="mt-3 flex gap-2 text-xs leading-5 text-amber-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Each file needs a different matching completed property before filing can begin.</p> : null}
    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-xs leading-5 text-slate-500">The portal rejects duplicate pairs, non-Excel files, properties outside the verified completed list, and the two in-progress and two errored provider rows. Filing remains blocked after 6 PM Pacific and on weekends.</p><Button type="button" disabled={!canSubmit} onClick={submit} className="bg-[#0b8775] hover:bg-[#087365]">{upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}File selected workbooks</Button></div>
    {progress ? <div className={`mt-5 rounded-xl border p-4 text-sm ${progress.errors.length ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}><p className="font-semibold">{progress.completed} of {progress.total} workbooks processed</p>{progress.filed.length ? <p className="mt-1 flex gap-2 text-xs leading-5"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />Filed: {progress.filed.join(" · ")}</p> : null}{progress.errors.map(message => <p key={message} className="mt-1 text-xs leading-5">{message}</p>)}</div> : null}
  </section>;
}

function StatusCard({ label, value, tone }: { label: string; value: string | number; tone: "teal" | "amber" | "rose" }) {
  const tones = { teal: "border-[#bfe9db] bg-[#effaf7] text-[#063e36]", amber: "border-amber-200 bg-amber-50 text-amber-900", rose: "border-rose-200 bg-rose-50 text-rose-900" };
  return <div className={`rounded-xl border p-3 ${tones[tone]}`}><p className="text-[10px] font-bold uppercase tracking-[0.13em] opacity-70">{label}</p><p className="mt-1 text-xs font-semibold leading-5">{value}</p></div>;
}
