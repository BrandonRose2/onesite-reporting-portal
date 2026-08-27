import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/portal/PageHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Check, CheckCircle2, ChevronRight, ClipboardCheck, Download, ExternalLink, FileSpreadsheet, Loader2, Mail, Phone, Save, Send, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type ItemStatus = "pending" | "confirmed" | "follow_up" | "escalated";
type ReviewItem = { id: string; sectionId: string; label: string; detail: string; status: ItemStatus; notes: string; targetDate: string };
type ReviewState = { version: 1; items: ReviewItem[] };

const sections = [
  ["cross_reference", "Source cross-reference", "Confirm that this report belongs to the property and review period shown above."],
  ["availability", "Availability follow-up", "Validate unit availability and recorded status before operating on any variance."],
  ["amount_owed", "Resident balance follow-up — amount owed", "Review material delinquent balances and the documented collection action for each applicable resident."],
  ["prepaid_credit", "Resident balance follow-up — prepaid / credit", "Review prepaid or credit balances and confirm their expected ledger treatment."],
  ["paid_zero", "Resident balance follow-up — paid / zero balance", "Validate paid or zero-balance entries that need confirmation from property operations."],
] as const;

const statusStyles: Record<ItemStatus, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-600",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  follow_up: "border-amber-200 bg-amber-50 text-amber-800",
  escalated: "border-rose-200 bg-rose-50 text-rose-800",
};

function contactName(contact: { managerName: string | null; recordName: string | null }) {
  return contact.managerName || contact.recordName?.replace(/\s*-\s*regional manager\s*$/i, "") || "Assigned contact";
}

function ContactCard({ contact, role }: { contact: { managerName: string | null; recordName: string | null; email: string | null; officePhone: string | null; mobilePhone: string | null; phoneExtension: string | null }; role: string }) {
  return <article className="rounded-xl border border-emerald-100 bg-white p-3.5 shadow-[0_10px_24px_-24px_rgba(6,78,59,.8)]"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087365]">{role}</p><h3 className="mt-1 text-sm font-semibold text-slate-900">{contactName(contact)}</h3><div className="mt-2.5 grid gap-1.5 text-xs text-slate-600">{contact.officePhone ? <a href={`tel:${contact.officePhone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 hover:text-[#087365]"><Phone className="h-3.5 w-3.5 text-[#087365]" />Office: {contact.officePhone}{contact.phoneExtension ? ` ext. ${contact.phoneExtension}` : ""}</a> : null}{contact.mobilePhone ? <a href={`tel:${contact.mobilePhone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 hover:text-[#087365]"><Smartphone className="h-3.5 w-3.5 text-[#087365]" />Mobile: {contact.mobilePhone}</a> : null}{contact.email ? <a href={`mailto:${contact.email}`} className="flex items-center gap-2 break-all hover:text-[#087365]"><Mail className="h-3.5 w-3.5 shrink-0 text-[#087365]" />{contact.email}</a> : <p>No email is available.</p>}</div></article>;
}

function downloadMarkdown(propertyName: string, requestId: number, markdown: string) {
  const filename = `${propertyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "property"}-manager-checklist-${requestId}.md`;
  const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

export default function ManagerChecklists() {
  const utils = trpc.useUtils();
  const { data: assignments = [], isLoading: loadingAssignments } = trpc.checklists.assignments.useQuery();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = useMemo(() => assignments.find(item => `${item.requestId}:${item.propertyId}` === selectedKey) ?? null, [assignments, selectedKey]);
  const review = trpc.checklists.review.useQuery({ requestId: selected?.requestId ?? 1, propertyId: selected?.propertyId ?? 1 }, { enabled: Boolean(selected) });
  const [state, setState] = useState<ReviewState | null>(null);
  const [managerSummary, setManagerSummary] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");

  useEffect(() => { if (!selectedKey && assignments[0]) setSelectedKey(`${assignments[0].requestId}:${assignments[0].propertyId}`); }, [assignments, selectedKey]);
  useEffect(() => {
    if (!review.data || !selected) return;
    const key = `${selected.requestId}:${selected.propertyId}`;
    setState(review.data.review.state as ReviewState);
    setManagerSummary(review.data.review.managerSummary);
    setMarkdown(review.data.markdown);
    setLoadedKey(key);
    setSavedSignature(JSON.stringify({ state: review.data.review.state, managerSummary: review.data.review.managerSummary }));
    setSaveState("saved");
  }, [review.data, selected?.requestId, selected?.propertyId]);

  const save = trpc.checklists.save.useMutation({ onSuccess: data => { setMarkdown(data.markdown); setSavedSignature(JSON.stringify({ state: data.review.state, managerSummary: data.review.managerSummary })); setSaveState("saved"); void utils.checklists.assignments.invalidate(); }, onError: () => setSaveState("error") });
  const submit = trpc.checklists.submit.useMutation({ onSuccess: data => { setState(data.review.state as ReviewState); setManagerSummary(data.review.managerSummary); setMarkdown(data.markdown); setSavedSignature(JSON.stringify({ state: data.review.state, managerSummary: data.review.managerSummary })); setSaveState("saved"); void utils.checklists.assignments.invalidate(); void utils.checklists.review.invalidate(); } });
  const currentKey = selected ? `${selected.requestId}:${selected.propertyId}` : null;
  const submitted = review.data?.review.status === "submitted";
  const stateSignature = useMemo(() => state ? JSON.stringify({ state, managerSummary }) : null, [state, managerSummary]);

  useEffect(() => {
    if (!selected || !state || !currentKey || loadedKey !== currentKey || submitted || stateSignature === savedSignature) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => save.mutate({ requestId: selected.requestId, propertyId: selected.propertyId, state, managerSummary }), 700);
    return () => window.clearTimeout(timer);
  }, [state, managerSummary, selected?.requestId, selected?.propertyId, currentKey, loadedKey, submitted, stateSignature, savedSignature]);

  const updateItem = (id: string, patch: Partial<ReviewItem>) => setState(previous => previous ? { ...previous, items: previous.items.map(item => item.id === id ? { ...item, ...patch } : item) } : previous);
  const progress = state ? { total: state.items.length, completed: state.items.filter(item => item.status !== "pending").length } : { total: 0, completed: 0 };
  const canSubmit = Boolean(state && selected && !submitted && progress.completed === progress.total && !save.isPending);

  return <DashboardLayout><PageHeader eyebrow="Portfolio / Manager Checklists" title="Manager report validation" description="Review only your assigned completed reports, confirm the data, and save every update automatically. Submitting records the completed validation; email delivery remains disabled." />
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="border-b border-slate-100 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">Assigned reports</p><h2 className="mt-1 text-base font-semibold text-slate-950">Your validation queue</h2><p className="mt-1 text-xs leading-5 text-slate-500">Property managers see only report reviews matched to their authorized email.</p></div>{loadingAssignments ? <div className="grid min-h-64 place-items-center text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /></div> : assignments.length ? <div className="max-h-[38rem] divide-y divide-slate-100 overflow-auto">{assignments.map(item => { const key = `${item.requestId}:${item.propertyId}`; return <button key={key} onClick={() => setSelectedKey(key)} className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors ${key === selectedKey ? "bg-[#effaf7]" : "hover:bg-slate-50"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.reviewStatus === "submitted" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.reviewStatus === "submitted" ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{item.propertyName}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.reportName}</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#087365]">{item.reviewStatus === "submitted" ? "Submitted" : "Needs validation"}</span></span><ChevronRight className="h-4 w-4 text-slate-300" /></button>; })}</div> : <div className="p-8 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No assigned reports</p><p className="mt-1 text-xs leading-5 text-slate-500">An administrator will assign reports by matching your portal email to the property directory.</p></div>}</aside>
      <main className="min-w-0">{!selected ? <EmptyState /> : review.isLoading || !state ? <div className="grid min-h-96 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#087365]" />Opening checklist…</div> : review.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">{review.error.message}</div> : <div className="space-y-5"><section className="overflow-hidden rounded-2xl bg-[#0c1d35] text-white shadow-[0_18px_40px_-30px_rgba(9,28,53,.9)]"><div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">Manager confirmation · {selected.source === "onesite" ? "OneSite" : "Yardi"}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{selected.propertyName}</h2><p className="mt-1.5 text-sm text-slate-300">{selected.reportName} · Request #{selected.requestId}</p></div><div className="flex flex-wrap items-center gap-2"><Button asChild size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link href={`/report-data/${selected.requestId}`}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open report data</Link></Button><Button size="sm" variant="outline" onClick={() => downloadMarkdown(selected.propertyName, selected.requestId, markdown)} className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Download className="mr-1.5 h-3.5 w-3.5" />Markdown</Button></div></div><div className="border-t border-white/10 bg-white/[0.045] px-5 py-3 sm:px-7"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-200">{submitted ? "Submitted validation is saved." : `${progress.completed} of ${progress.total} review items updated`}</span><span className="text-xs font-semibold text-emerald-200">{saveState === "saving" ? "Saving changes…" : saveState === "error" ? "Could not save — retrying on your next change" : "All changes saved"}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-300 transition-[width] duration-200" style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div></div></section>
        <section className="rounded-2xl border border-emerald-100 bg-[#effaf7] p-4 sm:p-5"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#087365]" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087365]">Manager contacts</p><h3 className="mt-1 text-sm font-semibold text-[#063e36]">Property and regional support</h3></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{[...review.data!.contacts.propertyContacts.map(contact => <ContactCard key={`property-${contact.email ?? contact.recordName ?? "property"}`} contact={contact} role="Property manager" />), ...review.data!.contacts.regionalContacts.map(contact => <ContactCard key={`regional-${contact.email ?? contact.recordName ?? "regional"}`} contact={contact} role={`Regional manager · ${review.data!.contacts.matchedRegion ?? "Assigned region"}`} />)]}</div></section>
        <section className="space-y-4">{sections.map(([id, title, description], sectionIndex) => { const items = state.items.filter(item => item.sectionId === id); return <article key={id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#edf7f6] text-xs font-bold text-[#087365]">{sectionIndex + 1}</span><div><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div></div><div className="divide-y divide-slate-100">{items.map(item => <div key={item.id} className="p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><h4 className="text-sm font-semibold text-slate-800">{item.label}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div><label className="shrink-0"><span className="sr-only">{item.label} status</span><select value={item.status} disabled={submitted} onChange={event => updateItem(item.id, { status: event.target.value as ItemStatus })} className={`h-9 min-w-32 rounded-lg border px-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0b8775]/20 disabled:cursor-not-allowed disabled:opacity-75 ${statusStyles[item.status]}`}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="follow_up">Follow-up</option><option value="escalated">Escalated</option></select></label></div><div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]"><input value={item.notes} disabled={submitted} onChange={event => updateItem(item.id, { notes: event.target.value })} onKeyDown={event => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }} placeholder="Notes, commitment, or blocker" className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#0b8775] focus:ring-2 focus:ring-[#0b8775]/15 disabled:bg-slate-50" /><label className="relative"><span className="sr-only">Target date</span><input type="date" value={item.targetDate} disabled={submitted} onChange={event => updateItem(item.id, { targetDate: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#0b8775] focus:ring-2 focus:ring-[#0b8775]/15 disabled:bg-slate-50" /></label></div></div>)}</div></article>; })}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087365]">Manager summary & commitments</p><h3 className="mt-1 text-base font-semibold text-slate-900">Completion statement</h3><p className="mt-1 text-xs leading-5 text-slate-500">Summarize confirmed data, outstanding follow-up, escalations, and target dates. This saves automatically.</p><textarea value={managerSummary} disabled={submitted} onChange={event => setManagerSummary(event.target.value)} placeholder="Enter your confirmation and commitments…" className="mt-4 min-h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-[#0b8775] focus:ring-2 focus:ring-[#0b8775]/15 disabled:bg-slate-50" />{submitted ? <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" />Submitted on {review.data!.review.submittedAt ? new Date(review.data!.review.submittedAt).toLocaleString() : "this session"}. Email delivery is not enabled.</div> : <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-slate-500">Submitting records this completed validation in the portal. It does not send an email.</p><Button disabled={!canSubmit || submit.isPending} onClick={() => state && selected && submit.mutate({ requestId: selected.requestId, propertyId: selected.propertyId, state, managerSummary })} className="bg-[#0b8775] hover:bg-[#087365]"><Send className="mr-2 h-4 w-4" />{submit.isPending ? "Submitting…" : "Submit report validation"}</Button></div>}</section>
      </div>}</main>
    </div>
  </DashboardLayout>;
}

function EmptyState() {
  return <div className="grid min-h-96 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center"><div><ClipboardCheck className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-800">Select an assigned report</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Your persistent property-specific checklist will open here.</p></div></div>;
}
