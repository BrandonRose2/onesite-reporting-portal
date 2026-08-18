import { useMemo, useState } from "react";
import { Panel } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Building2, CircleCheck, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { yardiCategoryOrder, yardiDesignatedProperties, yardiEmptyCategories, yardiReportCatalog } from "@/data/yardiReportCatalog";

export default function YardiReports() {
  const [query, setQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matchingReports = useMemo(
    () => yardiReportCatalog.filter((report) => !normalizedQuery || `${report.category} ${report.group ?? ""} ${report.title}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  );
  const selected = yardiReportCatalog.find((report) => `${report.category}::${report.group ?? ""}::${report.title}` === selectedReport);

  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-[1.5rem] bg-[#122b4b] p-6 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:p-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">Yardi report catalog</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Pull Reports – Yardi</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">Select from the report types captured from your live Yardi session. Yardi stays fully separate from OneSite and is scoped only to the eight Yardi-designated properties.</p>
      <div className="mt-5 flex flex-wrap gap-2"><Badge className="border-0 bg-white/15 text-white hover:bg-white/15">{yardiReportCatalog.length} captured report types</Badge><Badge className="border-0 bg-white/15 text-white hover:bg-white/15">9 report categories</Badge><Badge className="border-0 bg-white/15 text-white hover:bg-white/15">8 Yardi properties</Badge></div>
    </section>
    <Panel eyebrow="1. Choose report" title="Captured Yardi report types">
      <div className="space-y-4 p-5">
        <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, category, or report group" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#0c7469] focus:ring-2 focus:ring-[#bfe4de]" /></label>
        <select value={selectedReport} onChange={(event) => setSelectedReport(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0c7469] focus:ring-2 focus:ring-[#bfe4de]">
          <option value="">Choose a Yardi report ({matchingReports.length} matching)</option>
          {yardiCategoryOrder.map((category) => {
            const reports = matchingReports.filter((report) => report.category === category);
            if (!reports.length) return null;
            return <optgroup key={category} label={category}>{reports.map((report) => <option key={`${report.category}::${report.group ?? ""}::${report.title}`} value={`${report.category}::${report.group ?? ""}::${report.title}`}>{report.group ? `${report.group} — ` : ""}{report.title}</option>)}</optgroup>;
          })}
        </select>
        {selected ? <div className="rounded-xl border border-[#b9ded7] bg-[#f0faf7] p-4"><div className="flex flex-wrap items-center gap-2"><Badge className="border-0 bg-[#d6eee8] text-[#075e55] hover:bg-[#d6eee8]">{selected.category}</Badge>{selected.group ? <Badge variant="outline" className="border-[#b9ded7] text-[#075e55]">{selected.group}</Badge> : null}<Badge variant="outline" className="border-[#e4cf9c] bg-[#fff9e9] text-[#79561a]">Settings review required</Badge></div><p className="mt-3 font-semibold text-[#123b38]">{selected.title}</p><p className="mt-1 text-sm leading-6 text-[#35605b]">This report type is now discoverable. We will enable its report settings and live Edge pull after its Yardi parameters and export behavior are confirmed.</p></div> : null}
      </div>
    </Panel>
    <div className="grid gap-4 md:grid-cols-2">
      <Panel eyebrow="Scope" title="Yardi-designated properties"><div className="space-y-3 p-5"><div className="flex gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eaf5f3] text-[#0c7469]"><Building2 className="h-5 w-5" /></div><p className="text-sm leading-6 text-slate-600">The Yardi-star source identifies eight properties. They remain excluded from OneSite execution and will file to their own Property Reports Library folders.</p></div><div className="grid gap-1 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 sm:grid-cols-2">{yardiDesignatedProperties.map((property) => <span key={property}>• {property}</span>)}</div></div></Panel>
      <Panel eyebrow="Readiness" title="Safe Yardi setup"><div className="flex gap-3 p-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef5ff] text-[#275c98]"><LockKeyhole className="h-5 w-5" /></div><p className="text-sm leading-6 text-slate-600">Protected runner credentials and a live Edge session are configured. Catalog discovery does not run, export, or alter any Yardi report.</p></div></Panel>
    </div>
    <Panel eyebrow="Confirmed first workflow" title="Tenant Delinquency standard"><div className="grid gap-3 p-5 text-sm leading-6 text-slate-600 sm:grid-cols-2 lg:grid-cols-3"><p><strong className="text-slate-800">Property scope:</strong> all eight Yardi properties</p><p><strong className="text-slate-800">Unit / resident:</strong> leave blank for all within scope</p><p><strong className="text-slate-800">Resident status:</strong> Current residents only</p><p><strong className="text-slate-800">As Of:</strong> current day’s month/year</p><p><strong className="text-slate-800">Summarize by:</strong> Resident</p><p><strong className="text-slate-800">HUD subsidies:</strong> Include</p><p><strong className="text-slate-800">Output:</strong> Excel source + AptCorp HTML</p></div></Panel>
    <div className="flex items-start gap-3 rounded-xl border border-[#c4dfd7] bg-[#f3fbf8] p-4 text-sm text-[#245b53]"><CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0c7469]" /><p>The empty categories <strong>{yardiEmptyCategories.join(", ")}</strong> were observed in Yardi but have no currently configured report entries. They are retained in the catalog coverage count for future updates.</p></div>
    <div className="flex items-start gap-3 rounded-xl border border-[#ead8ad] bg-[#fffaf0] p-4 text-sm text-[#76521d]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>Selecting a report here never sends it automatically. Each report will remain in settings-review status until its Yardi filters, property behavior, and download workflow have been documented.</p></div>
  </div>;
}
