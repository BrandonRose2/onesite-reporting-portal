import { currency } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ClipboardCheck, Download, FileText, Printer, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";

function formatOffice(value?: string | null) {
  if (!value) return "Not available";
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value;
}

function filedAt(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function PropertyReportView() {
  const [, params] = useRoute("/property-reports/:propertyId");
  const [, setLocation] = useLocation();
  const propertyId = Number(params?.propertyId);
  const requestId = Number(new URLSearchParams(window.location.search).get("request"));
  const periodsQuery = trpc.delinquency.periods.useQuery();
  const periodId = Number(new URLSearchParams(window.location.search).get("period")) || periodsQuery.data?.[0]?.id || 0;
  const detailQuery = trpc.delinquency.propertyDetail.useQuery({ reportingPeriodId: periodId, propertyId }, { enabled: Boolean(periodId && propertyId) });
  const contactQuery = trpc.onesiteReporting.propertyContacts.useQuery();
  const documentsQuery = trpc.onesiteReporting.documents.useQuery();
  const documentUrlMutation = trpc.onesiteReporting.documentUrl.useMutation();
  const contact = contactQuery.data?.find(item => item.propertyId === propertyId);
  const documents = useMemo(() => (documentsQuery.data ?? []).filter(document => document.propertyId === propertyId && (!requestId || document.reportRequestId === requestId)), [documentsQuery.data, propertyId, requestId]);
  const workbook = documents.find(document => document.documentKind === "property_workbook") ?? null;
  const reportName = workbook?.requestedReportName ?? documents[0]?.requestedReportName ?? "AptCorp Property Report";
  const openWorkbook = () => {
    if (!workbook) return;
    const target = window.open("", "_blank");
    if (target) target.opener = null;
    documentUrlMutation.mutate({ documentId: workbook.id }, { onSuccess: ({ url }) => target ? target.location.replace(url) : window.location.assign(url), onError: () => target?.close() });
  };
  if (periodsQuery.isLoading || detailQuery.isLoading || documentsQuery.isLoading) return <Skeleton className="h-[36rem] rounded-[1.25rem]" />;
  if (!detailQuery.data?.summary) return <div className="space-y-4"><Button variant="outline" onClick={() => setLocation("/history")}><ArrowLeft className="mr-2 h-4 w-4" />Property Reports Library</Button><p className="text-sm text-slate-500">This property report is not available in the current reporting period.</p></div>;
  const { property, summary } = detailQuery.data.summary;
  const rows = detailQuery.data.rows ?? [];
  return <div className="mx-auto max-w-6xl space-y-6 print:max-w-none print:space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Button variant="outline" onClick={() => setLocation("/history")}><ArrowLeft className="mr-2 h-4 w-4" />Property Reports Library</Button><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / save PDF</Button>{workbook ? <Button className="hunter-metal-button" onClick={openWorkbook} disabled={documentUrlMutation.isPending}><Download className="mr-2 h-4 w-4" />Open workbook</Button> : null}</div></div>
    <article className="overflow-hidden rounded-[1.5rem] border border-[#d9e8e6] bg-white shadow-[0_18px_50px_rgba(16,37,63,0.08)] print:border-0 print:shadow-none"><header className="bg-[#122b4b] p-7 text-white sm:p-9"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">AptCorp Property Report</p><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-[-0.04em]">{property.name}</h1><p className="mt-2 text-sm text-slate-200">{reportName} · Property ID {property.externalId} · {property.region}</p></div><Badge className="border border-white/20 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">{workbook ? `Filed ${filedAt(workbook.createdAt)}` : "Current period review"}</Badge></div></header>
      <section className="grid gap-px bg-[#d9e8e6] sm:grid-cols-4"><Metric label="Current residents" value={String(summary.residentCount)} /><Metric label="Delinquent units" value={String(summary.delinquentUnits)} /><Metric label="Net balance" value={currency(summary.netBalance)} /><Metric label="90+ days" value={currency(summary.days90PlusAmount)} /></section>
      <section className="grid gap-5 p-6 lg:grid-cols-[1.1fr_.9fr] sm:p-8"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0c7469]">Report overview</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#122b4b]">Current-resident balance review</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">This HTML report is the manager-facing summary generated from the filed AptCorp reporting data. It is designed for review, printing, and manual sharing; the supporting workbook remains available above.</p><div className="mt-5 rounded-xl border border-[#d7e8e4] bg-[#f2faf7] p-4 text-sm text-[#173d32]"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-[#0c7469]" /><p>Resident rows shown below are limited to the current-resident reporting view. Source evidence remains retained in the property report folder.</p></div></div></div><aside className="rounded-xl border border-[#b9d7cf] bg-[#f1faf7] p-5"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#357560]">Manager contact</p><p className="mt-2 text-lg font-semibold text-[#122b4b]">{contact?.managerName || "Contact requires review"}</p><dl className="mt-4 space-y-3 text-sm"><div><dt className="font-bold uppercase tracking-[0.1em] text-[10px] text-[#357560]">Office & ext.</dt><dd className="mt-1 font-medium text-[#173d32]">{formatOffice(contact?.officePhone)}{contact?.extension ? ` · ext. ${contact.extension}` : " · extension not on file"}</dd></div><div><dt className="font-bold uppercase tracking-[0.1em] text-[10px] text-[#357560]">Email</dt><dd className="mt-1 break-all text-[#173d32]">{contact?.managerEmail || "Not available"}</dd></div><div><dt className="font-bold uppercase tracking-[0.1em] text-[10px] text-[#357560]">Mobile</dt><dd className="mt-1 text-[#173d32]">{contact?.mobilePhone || "Not available"}</dd></div></dl><Button size="sm" className="hunter-metal-button mt-5 w-full print:hidden" onClick={() => setLocation(`/manager-checklists/${property.id}?period=${periodId}`)}><ClipboardCheck className="mr-2 h-3.5 w-3.5" />Open manager checklist</Button></aside></section>
      <section className="border-t border-slate-100 p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0c7469]">Current residents</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#122b4b]">Balance and follow-up review</h2></div><p className="text-xs text-slate-500">{rows.length} current-resident ledger rows</p></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#194765] text-[10px] font-bold uppercase tracking-[0.1em] text-white"><tr>{["Unit", "Resident", "Balance", "90+ days", "Collection notes"].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} className="align-top"><td className="px-4 py-3 font-semibold text-[#122b4b]">{row.unit || "—"}</td><td className="px-4 py-3 text-slate-700">{row.residentName || "—"}</td><td className="px-4 py-3 text-right font-semibold text-[#122b4b]">{currency(row.netBalance)}</td><td className="px-4 py-3 text-right text-[#b44851]">{currency(row.days90PlusAmount)}</td><td className="max-w-[22rem] px-4 py-3 text-xs leading-5 text-slate-600">{row.collectionNotes || "—"}</td></tr>)}</tbody></table></div></section>
      <footer className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs text-slate-500 sm:px-8"><FileText className="mr-1.5 inline-block h-3.5 w-3.5 text-[#0c7469]" />Generated in AptCorp Property Reports · Open the manager checklist to save verification, commitments, and follow-up in real time.</footer>
    </article>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-[#122b4b]">{value}</p></div>;
}
