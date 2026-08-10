import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Panel, currency } from "@/components/delinquency-ui";
import { ArrowLeft, FileSpreadsheet, Printer, ShieldCheck } from "lucide-react";
import { useLocation, useRoute } from "wouter";

export default function SourceDocumentPreview() {
  const [, params] = useRoute("/source-documents/:sourceFileId");
  const [, setLocation] = useLocation();
  const sourceFileId = Number(params?.sourceFileId);
  const sourceQuery = trpc.delinquency.sourceDocumentPreview.useQuery({ sourceFileId }, { enabled: Boolean(sourceFileId) });

  if (sourceQuery.isLoading) return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Loading source document…</div>;
  if (!sourceQuery.data) return <div className="space-y-4"><Button variant="outline" onClick={() => window.history.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><p className="text-sm text-slate-500">This source document is unavailable.</p></div>;

  const { document, property, period, rows } = sourceQuery.data;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Button variant="outline" onClick={() => window.history.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back to checklist</Button>
      <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print source data</Button>
    </div>
    <section className="rounded-[1.5rem] bg-[#122b4b] p-6 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:p-7">
      <div className="flex flex-wrap items-start gap-4"><div className="rounded-xl bg-white/10 p-3"><FileSpreadsheet className="h-6 w-6 text-[#a9d8d1]" /></div><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">Authenticated source-document view</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{property.name}</h1><p className="mt-2 max-w-4xl break-words text-sm text-slate-200">{document.originalFilename}</p><p className="mt-1 text-xs text-slate-300">{period.name} · {document.parsedRowCount} parsed ledger rows · imported {new Date(document.importedAt).toLocaleString()}</p></div></div>
    </section>
    <Panel eyebrow="Archive control" title="Source data retained in the portal"><div className="flex items-center gap-2 p-5 text-sm text-slate-600"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0c7469]" />This view is generated from the archived import record and remains accessible only within the authenticated workspace.</div></Panel>
    <Panel eyebrow="Parsed report data" title={`${rows.length} resident ledger rows`}><div className="overflow-x-auto"><table className="w-full min-w-[930px] text-left text-xs"><thead className="bg-[#194765] text-[10px] font-bold uppercase tracking-[0.1em] text-white"><tr>{["Unit / resident", "Status", "Transaction", "Prepaid / credit", "Delinquent", "Net balance", "90+ days"].map(label => <th key={label} className="px-4 py-3 first:px-5">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id} className="align-top text-slate-600"><td className="px-5 py-3"><p className="font-semibold text-[#122b4b]">{row.unit ?? "—"}</p><p className="mt-1">{row.residentName ?? "—"}</p></td><td className="px-4 py-3">{row.residentStatus ?? "—"}</td><td className="px-4 py-3"><p>{row.transactionCode ?? "—"}</p><p className="mt-1 text-slate-400">{row.codeDescription ?? ""}</p></td><td className="px-4 py-3 text-right whitespace-nowrap">{currency(row.totalPrepaid)}</td><td className="px-4 py-3 text-right whitespace-nowrap">{currency(row.totalDelinquent)}</td><td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-[#122b4b]">{currency(row.netBalance)}</td><td className="px-4 py-3 text-right whitespace-nowrap text-[#b44851]">{currency(row.days90PlusAmount)}</td></tr>)}</tbody></table></div></Panel>
  </div>;
}
