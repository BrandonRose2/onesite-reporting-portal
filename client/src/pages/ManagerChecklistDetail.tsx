import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Panel, currency } from "@/components/delinquency-ui";
import { ArrowLeft, Check, Download, FileText, Printer, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";

type ResidentFollowUp = { contacted: boolean; arrangement: boolean; escalate: boolean; notes: string };
type ChecklistState = { managerName: string; callDate: string; callNotes: string; availabilityReviewed: boolean; availabilityNotes: string; residentFollowUps: Record<string, ResidentFollowUp> };
const blankChecklist: ChecklistState = { managerName: "", callDate: "", callNotes: "", availabilityReviewed: false, availabilityNotes: "", residentFollowUps: {} };

function residentCategory(row: { netBalance: unknown; totalPrepaid: unknown }) {
  if (Number(row.netBalance) > 0) return "owed";
  if (Number(row.totalPrepaid) > 0 || Number(row.netBalance) < 0) return "prepaid";
  return "paid";
}

function categoryTitle(category: string) {
  return category === "owed" ? "Amount owed" : category === "prepaid" ? "Prepaid / credit" : "Paid / zero balance";
}

export default function ManagerChecklistDetail() {
  const [, params] = useRoute("/manager-checklists/:propertyId");
  const [, setLocation] = useLocation();
  const propertyId = Number(params?.propertyId);
  const periodsQuery = trpc.delinquency.periods.useQuery();
  const queryPeriod = Number(new URLSearchParams(window.location.search).get("period"));
  const periodId = queryPeriod || periodsQuery.data?.[0]?.id || 0;
  const detailQuery = trpc.delinquency.propertyDetail.useQuery({ reportingPeriodId: periodId, propertyId }, { enabled: Boolean(periodId && propertyId) });
  const propertyContactsQuery = trpc.onesiteReporting.propertyContacts.useQuery();
  const [state, setState] = useState<ChecklistState>(blankChecklist);
  const [loadedKey, setLoadedKey] = useState("");
  const storageKey = `manager-checklist-v1:${periodId}:${propertyId}`;

  useEffect(() => {
    if (!periodId || !propertyId) return;
    const saved = localStorage.getItem(storageKey);
    try { setState(saved ? { ...blankChecklist, ...JSON.parse(saved) } : blankChecklist); } catch { setState(blankChecklist); }
    setLoadedKey(storageKey);
  }, [propertyId, periodId, storageKey]);

  useEffect(() => { if (loadedKey === storageKey) localStorage.setItem(storageKey, JSON.stringify(state)); }, [loadedKey, state, storageKey]);

  const propertyContact = useMemo(() => propertyContactsQuery.data?.find(contact => contact.propertyId === propertyId), [propertyContactsQuery.data, propertyId]);

  useEffect(() => {
    if (loadedKey !== storageKey || state.managerName || !propertyContact?.managerName) return;
    setState(current => current.managerName ? current : { ...current, managerName: propertyContact.managerName ?? "" });
  }, [loadedKey, propertyContact?.managerName, state.managerName, storageKey]);

  const rowsByCategory = useMemo(() => {
    const rows = detailQuery.data?.rows ?? [];
    return { owed: rows.filter(row => residentCategory(row) === "owed"), prepaid: rows.filter(row => residentCategory(row) === "prepaid"), paid: rows.filter(row => residentCategory(row) === "paid") };
  }, [detailQuery.data]);

  const updateFollowUp = (residentKey: string, update: Partial<ResidentFollowUp>) => setState(current => {
    const existing = current.residentFollowUps[residentKey];
    const base: ResidentFollowUp = existing ?? { contacted: false, arrangement: false, escalate: false, notes: "" };
    return { ...current, residentFollowUps: { ...current.residentFollowUps, [residentKey]: { ...base, ...update } } };
  });

  if (periodsQuery.isLoading || detailQuery.isLoading) return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Loading manager checklist…</div>;
  if (!detailQuery.data?.summary) return <div className="space-y-4"><Button variant="outline" onClick={() => setLocation("/manager-checklists")}><ArrowLeft className="mr-2 h-4 w-4" />Back to directory</Button><p className="text-sm text-slate-500">This property is not available in the selected reporting period.</p></div>;

  const { property, summary } = detailQuery.data.summary;
  const documents = detailQuery.data.sourceDocuments ?? [];
  const renderResidentTable = (category: "owed" | "prepaid" | "paid") => <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left"><thead className="bg-[#194765] text-[10px] font-bold uppercase tracking-[0.1em] text-white"><tr>{["Unit / resident", "Ledger status", "Prepaid / credit", "Owed", "90+ days", "Manager follow-up", "Notes"].map(label => <th key={label} className="px-3 py-3 first:px-5">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rowsByCategory[category].map(row => { const followUp = state.residentFollowUps[row.residentKey] ?? { contacted: false, arrangement: false, escalate: false, notes: "" }; return <tr key={row.id} className="align-top text-xs text-slate-600"><td className="px-5 py-3"><p className="font-semibold text-[#122b4b]">{row.unit ?? "—"}</p><p className="mt-1 text-slate-500">{row.residentName ?? "—"}</p></td><td className="px-3 py-3">{row.residentStatus ?? "—"}</td><td className="px-3 py-3 text-right font-medium whitespace-nowrap">{currency(row.totalPrepaid)}</td><td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-[#122b4b]">{currency(row.netBalance)}</td><td className="px-3 py-3 text-right whitespace-nowrap text-[#b44851]">{currency(row.days90PlusAmount)}</td><td className="px-3 py-3"><div className="flex gap-3 whitespace-nowrap"><label className="flex items-center gap-1.5"><Checkbox checked={followUp.contacted} onCheckedChange={checked => updateFollowUp(row.residentKey, { contacted: Boolean(checked) })} />Contacted</label><label className="flex items-center gap-1.5"><Checkbox checked={followUp.arrangement} onCheckedChange={checked => updateFollowUp(row.residentKey, { arrangement: Boolean(checked) })} />Arrangement</label><label className="flex items-center gap-1.5 text-[#b44851]"><Checkbox checked={followUp.escalate} onCheckedChange={checked => updateFollowUp(row.residentKey, { escalate: Boolean(checked) })} />Escalate</label></div></td><td className="px-3 py-3"><Input value={followUp.notes} onChange={event => updateFollowUp(row.residentKey, { notes: event.target.value })} placeholder="Manager note" className="h-8 min-w-44 text-xs" /></td></tr>; })}</tbody></table>{!rowsByCategory[category].length ? <p className="px-5 py-8 text-sm text-slate-500">No resident accounts are in this category.</p> : null}</div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Button variant="outline" onClick={() => setLocation("/manager-checklists")}><ArrowLeft className="mr-2 h-4 w-4" />Checklist directory</Button><div className="flex gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print checklist</Button><Button className="bg-[#0c7469] hover:bg-[#095e56]"><Save className="mr-2 h-4 w-4" />Saved locally</Button></div></div>
    <section className="rounded-[1.5rem] bg-[#122b4b] p-6 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:p-7"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">Manager checklist · {property.region}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{property.name}</h1><p className="mt-2 text-sm text-slate-200">ID {property.externalId} · {summary.residentCount} resident accounts · {summary.delinquentUnits} delinquent units</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs">Net owed {currency(summary.netBalance)}</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs">Prepaid {currency(summary.netPrepaid)}</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs">90+ {currency(summary.days90PlusAmount)}</span></div></section>
    <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]"><Panel eyebrow="Call details" title="Manager outreach record"><div className="grid gap-4 p-5 sm:grid-cols-2"><div className="sm:col-span-2 rounded-xl border border-[#b9d7cf] bg-[#f1faf7] p-4"><p className="text-xs font-bold uppercase tracking-[0.11em] text-[#357560]">Company Contacts</p><p className="mt-1 text-sm font-semibold text-[#122b4b]">{propertyContact?.managerName || "Property contact requires review"}</p><div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><p><span className="font-semibold text-[#357560]">Email:</span> {propertyContact?.managerEmail || "Not available"}</p><p><span className="font-semibold text-[#357560]">Mobile:</span> {propertyContact?.mobilePhone || "Not available"}</p><p><span className="font-semibold text-[#357560]">Office:</span> {propertyContact?.officePhone || "Not available"}{propertyContact?.extension ? ` · ext. ${propertyContact.extension}` : ""}</p><p><span className="font-semibold text-[#357560]">Directory status:</span> {propertyContact?.mappingStatus === "verified" ? "Verified" : "Review required"}</p></div></div><div><label className="text-xs font-semibold text-slate-600">Manager name</label><Input value={state.managerName} onChange={event => setState(current => ({ ...current, managerName: event.target.value }))} placeholder="Name" className="mt-1.5 bg-[#e5eeff]" /></div><div><label className="text-xs font-semibold text-slate-600">Call date & time</label><Input type="datetime-local" value={state.callDate} onChange={event => setState(current => ({ ...current, callDate: event.target.value }))} className="mt-1.5 bg-[#e5eeff]" /></div><div className="sm:col-span-2"><label className="text-xs font-semibold text-slate-600">Call summary & commitments</label><Textarea value={state.callNotes} onChange={event => setState(current => ({ ...current, callNotes: event.target.value }))} placeholder="Document commitments, payment timing, escalation needs, and next steps." className="mt-1.5 min-h-24 bg-[#e5eeff]" /></div></div></Panel><Panel eyebrow="Availability follow-up" title="Confirm current vacancy and readiness"><div className="space-y-4 p-5"><label className="flex items-center gap-2 text-sm font-medium text-[#122b4b]"><Checkbox checked={state.availabilityReviewed} onCheckedChange={checked => setState(current => ({ ...current, availabilityReviewed: Boolean(checked) }))} />I reviewed current availability and ready/not-ready status with the manager.</label><Textarea value={state.availabilityNotes} onChange={event => setState(current => ({ ...current, availabilityNotes: event.target.value }))} placeholder="Record ready dates, make-ready scope, prospective leases, and any non-revenue unit actions." className="min-h-24" /></div></Panel></section>
    <Panel eyebrow="Source cross-reference" title={`${documents.length} archived source files`}><div className="divide-y divide-slate-100">{documents.map(document => <div key={document.id} className="flex items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-center gap-3"><FileText className="h-5 w-5 shrink-0 text-[#0c7469]" /><div className="min-w-0"><p className="truncate text-sm font-medium text-[#122b4b]">{document.originalFilename}</p><p className="mt-1 text-xs text-slate-500">{document.parsedRowCount} rows · imported {new Date(document.importedAt).toLocaleString()}</p></div></div><a href={`/source-documents/${document.id}?period=${periodId}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#0c7469]"><Download className="h-3.5 w-3.5" />Open</a></div>)}<div className="flex items-center gap-2 p-4 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-[#0c7469]" />Source data opens in this authenticated portal and keeps resident balances protected.</div></div></Panel>
    <Tabs defaultValue="owed" className="space-y-4"><TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0"><TabsTrigger value="owed" className="border border-slate-200 bg-white px-4 py-2 data-[state=active]:border-[#0c7469] data-[state=active]:bg-[#eaf5f3]">Amount owed · {rowsByCategory.owed.length}</TabsTrigger><TabsTrigger value="prepaid" className="border border-slate-200 bg-white px-4 py-2 data-[state=active]:border-[#0c7469] data-[state=active]:bg-[#eaf5f3]">Prepaid / credit · {rowsByCategory.prepaid.length}</TabsTrigger><TabsTrigger value="paid" className="border border-slate-200 bg-white px-4 py-2 data-[state=active]:border-[#0c7469] data-[state=active]:bg-[#eaf5f3]">Paid / zero · {rowsByCategory.paid.length}</TabsTrigger></TabsList>{(["owed", "prepaid", "paid"] as const).map(category => <TabsContent key={category} value={category}><Panel eyebrow="Resident balance follow-up" title={categoryTitle(category)}>{renderResidentTable(category)}</Panel></TabsContent>)}</Tabs>
  </div>;
}
