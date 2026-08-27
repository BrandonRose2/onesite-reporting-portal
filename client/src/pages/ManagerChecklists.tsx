import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/portal/PageHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Check, CheckCircle2, ChevronRight, ClipboardCheck, Download, ExternalLink, FileSpreadsheet, Loader2, Mail, Phone, Save, Send, Smartphone, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

type ItemStatus = "pending" | "confirmed" | "follow_up" | "escalated";
type ReviewItem = { id: string; sectionId: string; label: string; detail: string; status: ItemStatus; notes: string; targetDate: string; reportedValue?: string; correctedValue?: string; sourceSheet?: string; sourceRow?: number; requiresVerification?: boolean };
type ReviewState = { version: 2; items: ReviewItem[] };
type Contact = { managerName: string | null; recordName: string | null; email: string | null; officePhone: string | null; mobilePhone: string | null; phoneExtension: string | null };
type ReviewBlocker = { itemId: string; message: string };

const workbookExtensions = /\.(xlsx|xls|xlsm|csv)$/i;
const clean = (value: unknown) => String(value ?? "").trim();
const normalize = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const isBlankRow = (row: unknown[]) => row.every(cell => !clean(cell));
const excludedManagerColumns = new Set(["resh id", "res id", "resident id", "lease id"]);

function contactName(contact: Contact) { return contact.managerName || contact.recordName?.replace(/\s*-\s*regional manager\s*$/i, "") || "Assigned contact"; }

function ContactCard({ contact, role }: { contact: Contact; role: string }) {
  return <article className="rounded-xl border border-emerald-100 bg-white p-3.5 shadow-[0_10px_24px_-24px_rgba(6,78,59,.8)]"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087365]">{role}</p><h3 className="mt-1 text-sm font-semibold text-slate-900">{contactName(contact)}</h3><div className="mt-2.5 grid gap-1.5 text-xs text-slate-600">{contact.officePhone ? <a href={`tel:${contact.officePhone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 hover:text-[#087365]"><Phone className="h-3.5 w-3.5 text-[#087365]" />Office: {contact.officePhone}{contact.phoneExtension ? ` ext. ${contact.phoneExtension}` : ""}</a> : null}{contact.mobilePhone ? <a href={`tel:${contact.mobilePhone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 hover:text-[#087365]"><Smartphone className="h-3.5 w-3.5 text-[#087365]" />Mobile: {contact.mobilePhone}</a> : null}{contact.email ? <a href={`mailto:${contact.email}`} className="flex items-center gap-2 break-all hover:text-[#087365]"><Mail className="h-3.5 w-3.5 shrink-0 text-[#087365]" />{contact.email}</a> : <p>No email is available.</p>}</div></article>;
}

function downloadMarkdown(propertyName: string, requestId: number, markdown: string) {
  const filename = `${propertyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "property"}-manager-review-${requestId}.md`;
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

function columnIndex(headers: unknown[], candidates: string[]) {
  const values = headers.map(normalize);
  return candidates.map(candidate => values.findIndex(value => value === normalize(candidate) || value.includes(normalize(candidate)))).find(index => index >= 0);
}

function buildReviewItems(sheets: Array<{ name: string; rows: unknown[][] }>, limit = 300): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const sheet of sheets) {
    if (items.length >= limit) break;
    const headerIndex = sheet.rows.findIndex(row => {
      const text = row.map(normalize).join(" ");
      return (text.includes("total delinquent") && (text.includes("unit") || text.includes("resident"))) || row.filter(value => clean(value)).length >= 4;
    });
    if (headerIndex < 0) continue;
    const headers = sheet.rows[headerIndex];
    const unitIndex = columnIndex(headers, ["Bldg/Unit", "Unit", "Apartment", "Unit number"]);
    const residentIndex = columnIndex(headers, ["Resident", "Resident Name", "Name", "Tenant"]);
    const statusIndex = columnIndex(headers, ["Status", "Resident Status"]);
    const amountIndex = columnIndex(headers, ["Total Delinquent", "Amount", "Balance", "Net Balance", "Total"]);
    const sourceRows = sheet.rows.slice(headerIndex + 1).map((row, index) => ({ row, sourceRow: headerIndex + index + 2 })).filter(({ row }) => !isBlankRow(row) && !row.some(value => normalize(value) === "totals"));
    const currentRows = statusIndex === undefined ? sourceRows : sourceRows.filter(({ row }) => normalize(row[statusIndex]).includes("current"));
    const rowsToReview = currentRows.length ? currentRows : sourceRows;
    for (const { row, sourceRow } of rowsToReview) {
      if (items.length >= limit) break;
      const unit = unitIndex === undefined ? "" : clean(row[unitIndex]);
      const resident = residentIndex === undefined || excludedManagerColumns.has(normalize(headers[residentIndex])) ? "" : clean(row[residentIndex]);
      const status = statusIndex === undefined ? "" : clean(row[statusIndex]);
      const reportedValue = amountIndex === undefined ? "" : clean(row[amountIndex]);
      const label = [unit, resident].filter(Boolean).join(" · ") || `${sheet.name} row ${sourceRow}`;
      items.push({ id: `${sheet.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${sourceRow}`, sectionId: "report_lines", label, detail: [sheet.name, `source row ${sourceRow}`, status].filter(Boolean).join(" · "), reportedValue: reportedValue || undefined, sourceSheet: sheet.name, sourceRow, status: "pending", notes: "", targetDate: "", requiresVerification: true });
    }
  }
  return items;
}

function blockersFor(state: ReviewState, managerSummary: string): ReviewBlocker[] {
  const blockers: ReviewBlocker[] = [];
  for (const item of state.items) {
    if (item.status === "pending") blockers.push({ itemId: item.id, message: `${item.label}: choose Verified or Needs correction.` });
    if (item.status === "follow_up" && !item.correctedValue?.trim()) blockers.push({ itemId: item.id, message: `${item.label}: add the corrected amount or value.` });
    if ((item.status === "follow_up" || item.status === "escalated") && !item.notes.trim()) blockers.push({ itemId: item.id, message: `${item.label}: explain the correction for upper management.` });
  }
  if (state.items.length && !managerSummary.trim()) blockers.push({ itemId: "manager-summary", message: "Add a brief manager summary before submitting for review." });
  return blockers;
}

export default function ManagerChecklists() {
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const { data: assignments = [], isLoading: loadingAssignments } = trpc.checklists.assignments.useQuery();
  const requestedKey = useMemo(() => { const query = new URLSearchParams(location.split("?")[1] ?? ""); const requestId = query.get("requestId"); const propertyId = query.get("propertyId"); return requestId && propertyId ? `${requestId}:${propertyId}` : null; }, [location]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = useMemo(() => assignments.find(item => `${item.requestId}:${item.propertyId}` === selectedKey) ?? null, [assignments, selectedKey]);
  const review = trpc.checklists.review.useQuery({ requestId: selected?.requestId ?? 1, propertyId: selected?.propertyId ?? 1 }, { enabled: Boolean(selected) });
  const [state, setState] = useState<ReviewState | null>(null);
  const [managerSummary, setManagerSummary] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [deriving, setDeriving] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const derivationKeyRef = useRef<string | null>(null);

  useEffect(() => { if (!selectedKey && (requestedKey ? assignments.some(item => `${item.requestId}:${item.propertyId}` === requestedKey) : assignments[0])) setSelectedKey(requestedKey && assignments.some(item => `${item.requestId}:${item.propertyId}` === requestedKey) ? requestedKey : `${assignments[0].requestId}:${assignments[0].propertyId}`); }, [assignments, requestedKey, selectedKey]);
  useEffect(() => { if (requestedKey && assignments.some(item => `${item.requestId}:${item.propertyId}` === requestedKey) && selectedKey !== requestedKey) setSelectedKey(requestedKey); }, [assignments, requestedKey, selectedKey]);
  useEffect(() => {
    if (!review.data || !selected) return;
    const key = `${selected.requestId}:${selected.propertyId}`;
    const saved = review.data.review.state as ReviewState;
    setState(saved); setManagerSummary(review.data.review.managerSummary); setMarkdown(review.data.markdown); setLoadedKey(key); setSavedSignature(JSON.stringify({ state: saved, managerSummary: review.data.review.managerSummary })); setSaveState("saved");
  }, [review.data, selected?.requestId, selected?.propertyId]);
  useEffect(() => {
    if (!review.data || !selected || state?.items.length) return;
    const key = `${selected.requestId}:${selected.propertyId}`;
    if (derivationKeyRef.current === key) return;
    derivationKeyRef.current = key;
    const fallback: ReviewState = { version: 2, items: [{ id: "report-completeness", sectionId: "report_review", label: "Confirm report completeness", detail: "Open the source report and confirm it is complete and accurate.", status: "pending", notes: "", targetDate: "", requiresVerification: true }] };
    setState(fallback);
    const source = review.data.documents.find(document => document.documentKind === "source_report" && workbookExtensions.test(document.originalFilename));
    if (!source) return;
    void (async () => {
      try {
        const response = await fetch(source.storageUrl);
        if (!response.ok) throw new Error("Workbook could not be opened.");
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await response.arrayBuffer(), { type: "array", cellDates: true });
        const sheets = workbook.SheetNames.map(name => ({ name, rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: "", raw: false }) }));
        const items = buildReviewItems(sheets);
        if (derivationKeyRef.current === key && items.length) setState({ version: 2, items });
      } catch {
        // The immediately displayed fallback remains available if the optional source parse cannot complete.
      }
    })();
  }, [review.data, selected?.requestId, selected?.propertyId, state?.items.length]);

  const save = trpc.checklists.save.useMutation({ onSuccess: data => { setMarkdown(data.markdown); setSavedSignature(JSON.stringify({ state: data.review.state, managerSummary: data.review.managerSummary })); setSaveState("saved"); void utils.checklists.assignments.invalidate(); }, onError: () => setSaveState("error") });
  const submit = trpc.checklists.submit.useMutation({ onSuccess: data => { setState(data.review.state as ReviewState); setManagerSummary(data.review.managerSummary); setMarkdown(data.markdown); setSavedSignature(JSON.stringify({ state: data.review.state, managerSummary: data.review.managerSummary })); setSaveState("saved"); void utils.checklists.assignments.invalidate(); void utils.checklists.review.invalidate(); } });
  const currentKey = selected ? `${selected.requestId}:${selected.propertyId}` : null;
  const submitted = review.data?.review.status === "submitted";
  const stateSignature = useMemo(() => state ? JSON.stringify({ state, managerSummary }) : null, [state, managerSummary]);
  useEffect(() => { if (!selected || !state || !currentKey || loadedKey !== currentKey || submitted || stateSignature === savedSignature) return; setSaveState("saving"); const timer = window.setTimeout(() => save.mutate({ requestId: selected.requestId, propertyId: selected.propertyId, state, managerSummary }), 700); return () => window.clearTimeout(timer); }, [state, managerSummary, selected?.requestId, selected?.propertyId, currentKey, loadedKey, submitted, stateSignature, savedSignature]);

  const updateItem = (id: string, patch: Partial<ReviewItem>) => setState(previous => previous ? { ...previous, items: previous.items.map(item => item.id === id ? { ...item, ...patch } : item) } : previous);
  const progress = state ? { total: state.items.length, completed: state.items.filter(item => item.status !== "pending").length } : { total: 0, completed: 0 };
  const needsAttention = useMemo(() => state ? blockersFor(state, managerSummary) : [], [state, managerSummary]);
  const canSubmit = Boolean(state && selected && !submitted && state.items.length && !needsAttention.length && !save.isPending);
  const focusIssue = (itemId: string) => { const element = itemId === "manager-summary" ? summaryRef.current : rowRefs.current[itemId]; if (!element) return; element.scrollIntoView({ behavior: "smooth", block: "center" }); setHighlightedId(itemId); window.setTimeout(() => setHighlightedId(current => current === itemId ? null : current), 1800); window.setTimeout(() => (element.querySelector("button, input, textarea, select") as HTMLElement | null)?.focus({ preventScroll: true }), 350); };

  return <DashboardLayout><PageHeader eyebrow="Portfolio / Manager Review" title="Verify report data" description="Review the report lines assigned to your property, confirm the reported amounts, record corrections, and submit the saved review for approval." />
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]"><aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="border-b border-slate-100 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">Manager review queue</p><h2 className="mt-1 text-base font-semibold text-slate-950">Reports needing your validation</h2><p className="mt-1 text-xs leading-5 text-slate-500">Open a report, verify each row, then submit it to upper management for review.</p></div>{loadingAssignments ? <div className="grid min-h-64 place-items-center text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /></div> : assignments.length ? <div className="max-h-[38rem] divide-y divide-slate-100 overflow-auto">{assignments.map(item => { const key = `${item.requestId}:${item.propertyId}`; return <button key={key} onClick={() => setSelectedKey(key)} className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors ${key === selectedKey ? "bg-[#effaf7]" : "hover:bg-slate-50"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.reviewStatus === "submitted" ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.reviewStatus === "submitted" ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{item.propertyName}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.reportName}</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#087365]">{item.reviewStatus === "submitted" ? "Submitted for review" : "Start verification"}</span></span><ChevronRight className="h-4 w-4 text-slate-300" /></button>; })}</div> : <div className="p-8 text-center"><ClipboardCheck className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No assigned reports</p><p className="mt-1 text-xs leading-5 text-slate-500">Completed reports will appear here when your portal email matches the property or regional manager directory.</p></div>}</aside>
      <main className="min-w-0">{!selected ? <EmptyState /> : review.isLoading || !state || deriving ? <div className="grid min-h-96 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#087365]" />Preparing the report review…</div> : review.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{review.error.message}</div> : <div className="space-y-5"><section className="overflow-hidden rounded-2xl bg-[#0c1d35] text-white shadow-[0_18px_40px_-30px_rgba(9,28,53,.9)]"><div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Your next step · verify each report line</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{selected.propertyName}</h2><p className="mt-1.5 text-sm text-slate-300">{selected.reportName} · Request #{selected.requestId}</p></div><div className="flex flex-wrap items-center gap-2"><Button asChild size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link href={`/report-data/${selected.requestId}`}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open report data</Link></Button><Button size="sm" variant="outline" onClick={() => downloadMarkdown(selected.propertyName, selected.requestId, markdown)} className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Download className="mr-1.5 h-3.5 w-3.5" />Markdown record</Button></div></div><div className="border-t border-white/10 bg-white/[0.045] px-5 py-4 sm:px-7"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-medium text-white">{submitted ? "Submitted for review" : `${progress.completed} of ${progress.total} report lines reviewed`}</span><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200">{saveState === "saving" ? <Save className="h-3.5 w-3.5 animate-pulse" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{saveState === "saving" ? "Saving changes…" : saveState === "error" ? "Could not save — make another edit to retry" : "All changes saved"}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300 transition-[width] duration-200" style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div>{!submitted && needsAttention.length ? <p className="mt-2 text-xs text-rose-200">{needsAttention.length} item{needsAttention.length === 1 ? "" : "s"} still need attention before submission.</p> : null}</div></section>
        <section className="rounded-2xl border border-emerald-100 bg-[#effaf7] p-4 sm:p-5"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#087365]" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087365]">Review contacts</p><h3 className="mt-1 text-sm font-semibold text-[#063e36]">Property and regional support</h3></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{[...review.data!.contacts.propertyContacts.map(contact => <ContactCard key={`property-${contact.email ?? contact.recordName ?? "property"}`} contact={contact} role="Property manager" />), ...review.data!.contacts.regionalContacts.map(contact => <ContactCard key={`regional-${contact.email ?? contact.recordName ?? "regional"}`} contact={contact} role={`Regional manager · ${review.data!.contacts.matchedRegion ?? "Assigned region"}`} />)]}</div></section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="border-b border-slate-100 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087365]">Report line validation</p><h3 className="mt-1 text-base font-semibold text-slate-900">Verify each reported balance</h3><p className="mt-1 text-xs leading-5 text-slate-500">Use <strong>Verified</strong> when the reported value is correct. Select <strong>Needs correction</strong> to enter the corrected value and a note for upper management.</p></div><div className="divide-y divide-slate-100">{state.items.map((item, index) => <div key={item.id} ref={element => { rowRefs.current[item.id] = element; }} className={`scroll-mt-5 p-4 transition-colors sm:p-5 ${highlightedId === item.id ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : item.status === "follow_up" ? "bg-rose-50/40" : ""}`}><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-md bg-[#edf7f6] text-[10px] font-bold text-[#087365]">{index + 1}</span><h4 className="text-sm font-semibold text-slate-900">{item.label}</h4>{item.reportedValue ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold tabular-nums text-slate-700">Reported: {item.reportedValue}</span> : null}</div><p className="mt-2 text-xs leading-5 text-slate-500">{item.detail || "Report data line requiring manager confirmation."}</p></div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" disabled={submitted} onClick={() => updateItem(item.id, { status: item.status === "confirmed" ? "pending" : "confirmed", correctedValue: item.status === "confirmed" ? item.correctedValue : "" })} className={`min-h-10 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${item.status === "confirmed" ? "border-emerald-400 bg-emerald-100 text-emerald-900" : "border-emerald-300 bg-emerald-50 text-[#087365] hover:bg-emerald-100"}`}><Check className="mr-1 inline h-3.5 w-3.5" />{item.status === "confirmed" ? "Verified" : "Mark verified"}</button><button type="button" disabled={submitted} onClick={() => updateItem(item.id, { status: item.status === "follow_up" ? "pending" : "follow_up" })} className={`min-h-10 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${item.status === "follow_up" ? "border-rose-400 bg-rose-100 text-rose-900" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>Needs correction</button></div></div>{item.status === "follow_up" || item.status === "escalated" ? <div className="mt-4 grid gap-3 rounded-xl border border-rose-200 bg-white/80 p-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]"><label><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">Corrected amount / value *</span><input value={item.correctedValue ?? ""} disabled={submitted} onChange={event => updateItem(item.id, { correctedValue: event.target.value })} placeholder="Enter corrected amount" className="mt-1.5 h-10 w-full rounded-lg border border-rose-300 bg-rose-50 px-3 text-sm outline-none placeholder:text-rose-400 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-200 disabled:bg-slate-50" /></label><label><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">Note to upper management *</span><input value={item.notes} disabled={submitted} onChange={event => updateItem(item.id, { notes: event.target.value })} placeholder="Explain what is different and what action is needed" className="mt-1.5 h-10 w-full rounded-lg border border-rose-300 bg-rose-50 px-3 text-sm outline-none placeholder:text-rose-400 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-200 disabled:bg-slate-50" /></label></div> : <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]"><input value={item.notes} disabled={submitted} onChange={event => updateItem(item.id, { notes: event.target.value })} placeholder="Optional context or follow-up note" className="h-10 min-w-0 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#0b8775] focus:bg-white focus:ring-2 focus:ring-[#0b8775]/15 disabled:bg-slate-50" /><input type="date" value={item.targetDate} disabled={submitted} onChange={event => updateItem(item.id, { targetDate: event.target.value })} className="h-10 w-full rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 text-sm text-slate-600 outline-none focus:border-[#0b8775] focus:bg-white focus:ring-2 focus:ring-[#0b8775]/15 disabled:bg-slate-50" /></div>}</div>)}</div></section>
        <section ref={summaryRef} id="manager-summary" className={`scroll-mt-5 rounded-2xl border bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)] ${highlightedId === "manager-summary" ? "border-amber-300 ring-2 ring-amber-200" : "border-slate-200"}`}><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087365]">Submission summary</p><h3 className="mt-1 text-base font-semibold text-slate-900">Tell upper management what you confirmed or corrected</h3><textarea value={managerSummary} disabled={submitted} onChange={event => setManagerSummary(event.target.value)} placeholder="Required: summarize verified data, corrections, responsible parties, and next steps…" className="mt-4 min-h-32 w-full rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-[#087365] focus:bg-white focus:ring-2 focus:ring-[#0b8775]/20 disabled:bg-slate-50" />{submitted ? <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" />Submitted for review on {review.data!.review.submittedAt ? new Date(review.data!.review.submittedAt).toLocaleString() : "this session"}. Email delivery is not enabled.</div> : <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]"><div className={`rounded-xl border p-4 ${needsAttention.length ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>{needsAttention.length ? <><div className="flex items-center gap-2 text-sm font-semibold text-rose-900"><AlertCircle className="h-4 w-4" />Needs attention · {needsAttention.length}</div><p className="mt-1 text-xs text-rose-800">Select an item to jump directly to the required correction.</p><div className="mt-3 grid gap-1.5">{needsAttention.slice(0, 12).map(issue => <button key={issue.itemId} type="button" onClick={() => focusIssue(issue.itemId)} className="rounded-lg bg-white px-3 py-2 text-left text-xs font-medium text-rose-800 shadow-sm transition-colors hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400">{issue.message}</button>)}{needsAttention.length > 12 ? <p className="px-1 text-xs text-rose-700">Plus {needsAttention.length - 12} more item{needsAttention.length - 12 === 1 ? "" : "s"} in the report.</p> : null}</div></> : <><div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 className="h-4 w-4" />Ready for review</div><p className="mt-1 text-xs text-emerald-800">All required report lines and the manager summary are complete.</p></>}</div><div className="flex items-end"><Button disabled={!canSubmit || submit.isPending} onClick={() => state && selected && submit.mutate({ requestId: selected.requestId, propertyId: selected.propertyId, state, managerSummary })} className="min-h-11 w-full bg-[#0b8775] hover:bg-[#087365] lg:w-auto"><Send className="mr-2 h-4 w-4" />{submit.isPending ? "Submitting…" : "Submit for Review"}</Button></div></div>}</section>
      </div>}</main></div>
  </DashboardLayout>;
}

function EmptyState() { return <div className="grid min-h-96 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center"><div><ClipboardCheck className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-800">Select a report to review</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Your assigned report data and manager validation controls will open here.</p></div></div>; }
