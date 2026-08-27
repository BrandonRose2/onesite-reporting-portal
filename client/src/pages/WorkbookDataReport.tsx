import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/portal/PageHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileSpreadsheet, Loader2, Mail, Phone, Smartphone, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";

type SheetData = { name: string; rows: unknown[][] };

function isWorkbook(filename: string) {
  return /\.(xlsx|xls|xlsm|csv)$/i.test(filename);
}

function ContactCard({ contact, role }: { contact: { managerName: string | null; recordName: string | null; email: string | null; officePhone: string | null; mobilePhone: string | null; phoneExtension: string | null }; role: string }) {
  const name = contact.managerName || contact.recordName?.replace(/\s*-\s*regional manager\s*$/i, "") || "Assigned contact";
  return <article className="rounded-xl border border-emerald-100 bg-white p-4 shadow-[0_10px_24px_-24px_rgba(6,78,59,.8)]"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087365]">{role}</p><h3 className="mt-1.5 text-sm font-semibold text-slate-900">{name}</h3><div className="mt-3 grid gap-2 text-xs text-slate-600">{contact.officePhone ? <a href={`tel:${contact.officePhone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 hover:text-[#087365]"><Phone className="h-3.5 w-3.5 text-[#087365]" />Office: {contact.officePhone}{contact.phoneExtension ? ` ext. ${contact.phoneExtension}` : ""}</a> : null}{contact.mobilePhone ? <a href={`tel:${contact.mobilePhone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 hover:text-[#087365]"><Smartphone className="h-3.5 w-3.5 text-[#087365]" />Mobile: {contact.mobilePhone}</a> : null}{contact.email ? <a href={`mailto:${contact.email}`} className="flex items-center gap-2 break-all hover:text-[#087365]"><Mail className="h-3.5 w-3.5 shrink-0 text-[#087365]" />{contact.email}</a> : null}{!contact.officePhone && !contact.mobilePhone && !contact.email ? <p>No contact details are currently available.</p> : null}</div></article>;
}

function normalize(value: unknown) { return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function isBlankRow(row: unknown[]) { return row.every(value => !String(value ?? "").trim()); }
function findDataHeader(rows: unknown[][]) { return rows.findIndex(row => { const text = row.map(normalize).join(" "); return text.includes("total delinquent") && (text.includes("bldg unit") || text.includes("unit")); }); }
function columnIndex(headers: unknown[], candidates: string[]) { const values = headers.map(normalize); return candidates.map(candidate => values.findIndex(value => value === normalize(candidate) || value.includes(normalize(candidate)))).find(index => index >= 0); }

function WorkbookGrid({ sheets }: { sheets: SheetData[] }) {
  const [activeSheet, setActiveSheet] = useState(0);
  const rows = sheets[activeSheet]?.rows ?? [];
  const headerIndex = useMemo(() => findDataHeader(rows), [rows]);
  const metadataRows = headerIndex > 0 ? rows.slice(0, headerIndex).filter(row => !isBlankRow(row)) : [];
  const displayRows = headerIndex >= 0 ? rows.slice(headerIndex) : rows;
  const headers = displayRows[0] ?? [];
  const bodyRows = displayRows.slice(1).filter(row => !isBlankRow(row));
  const columnCount = useMemo(() => Math.max(1, ...displayRows.map(row => row.length)), [displayRows]);
  const totals = bodyRows.find(row => row.some(value => normalize(value) === "totals"));
  const summaryFields = [["Total delinquent", ["Total Delinquent"]], ["Net balance", ["Net Balance"]], ["Current", ["Current"]], ["30 days", ["30 Days"]], ["60 days", ["60 Days"]], ["90+ days", ["90+ Days"]]] as const;
  const metrics = totals ? summaryFields.reduce<Array<{ label: string; value: string }>>((items, [label, candidates]) => {
    const index = columnIndex(headers, Array.from(candidates));
    if (index !== undefined) items.push({ label, value: String(totals[index] ?? "—") });
    return items;
  }, []) : [];
  const metadataText = metadataRows.flat().map(value => String(value ?? "").trim()).filter(Boolean);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="border-b border-slate-100 px-4 pt-3 sm:px-5"><div className="flex gap-1 overflow-x-auto">{sheets.map((sheet, index) => <button key={sheet.name} onClick={() => setActiveSheet(index)} className={`min-h-10 shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold ${activeSheet === index ? "bg-[#edf7f6] text-[#087365]" : "text-slate-500 hover:bg-slate-50"}`}>{sheet.name}</button>)}</div></div><div className="border-b border-slate-100 px-4 py-4 sm:px-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087365]">Actual workbook data</p><div className="mt-1 flex flex-wrap items-end justify-between gap-2"><div><p className="text-base font-semibold text-slate-900">{sheets[activeSheet]?.name ?? "Workbook data"}</p><p className="mt-0.5 text-xs text-slate-500">{bodyRows.length.toLocaleString()} detail rows · {columnCount} columns</p></div>{metadataText.length ? <details className="mt-0 rounded-lg border border-emerald-100 bg-emerald-50/50"><summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[#087365]">Report header & parameters</summary><div className="max-h-44 overflow-auto border-t border-emerald-100 px-3 py-2 text-xs leading-5 text-[#356e65]">{metadataText.map((line, index) => <p key={index}>{line}</p>)}</div></details> : null}</div></div>{metrics.length ? <div className="grid grid-cols-2 border-b border-slate-100 sm:grid-cols-3 lg:grid-cols-6">{metrics.map(metric => <div key={metric.label} className="border-b border-r border-slate-100 px-3 py-3 last:border-r-0 sm:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n)]:border-r lg:[&:nth-child(6n)]:border-r-0"><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">{metric.label}</p><p className="mt-1 truncate text-sm font-semibold text-[#075f58]" title={metric.value}>{metric.value}</p></div>)}</div> : null}<div className="max-h-[68vh] overflow-auto"><table className="min-w-max border-collapse text-left text-xs"><thead><tr><th className="sticky left-0 top-0 z-20 border-b border-r border-slate-200 bg-[#effaf6] px-3 py-2 text-right text-[10px] font-bold text-[#087365]">#</th>{Array.from({ length: columnCount }, (_, columnIndex) => <th key={columnIndex} className="sticky top-0 z-10 min-w-28 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 align-bottom text-[10px] font-bold uppercase tracking-[0.03em] text-slate-600">{String(headers[columnIndex] ?? `Column ${columnIndex + 1}`)}</th>)}</tr></thead><tbody>{bodyRows.map((row, rowIndex) => <tr key={rowIndex} className="text-slate-600 odd:bg-white even:bg-slate-50/50 hover:bg-emerald-50/60"><th scope="row" className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit px-3 py-2 text-right text-[10px] font-bold text-slate-400">{rowIndex + 1}</th>{Array.from({ length: columnCount }, (_, columnIndex) => <td key={columnIndex} className="max-w-80 border-b border-r border-slate-100 px-3 py-2 align-top whitespace-pre-wrap">{String(row[columnIndex] ?? "")}</td>)}</tr>)}</tbody></table>{!displayRows.length ? <p className="p-8 text-center text-sm text-slate-500">This worksheet has no displayable cells.</p> : null}</div></section>;
}

export default function WorkbookDataReport() {
  const [, params] = useRoute("/report-data/:id");
  const requestId = Number(params?.id);
  const { data: details, isLoading: loadingDetails } = trpc.requests.details.useQuery({ id: requestId || 1 }, { enabled: Number.isInteger(requestId) && requestId > 0 });
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const workbook = details?.documents.filter(document => isWorkbook(document.originalFilename)).at(-1);

  useEffect(() => {
    let active = true;
    if (!workbook) return;
    setLoadError(null); setSheets([]);
    void (async () => {
      try {
        const response = await fetch(workbook.storageUrl);
        if (!response.ok) throw new Error("The filed workbook could not be opened.");
        const XLSX = await import("xlsx");
        const parsed = XLSX.read(await response.arrayBuffer(), { type: "array", cellDates: true });
        const nextSheets = parsed.SheetNames.map(name => ({ name, rows: XLSX.utils.sheet_to_json<unknown[]>(parsed.Sheets[name], { header: 1, defval: "", raw: false }) }));
        if (active) setSheets(nextSheets);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "The workbook data could not be loaded.");
      }
    })();
    return () => { active = false; };
  }, [workbook?.storageUrl]);

  const contactMatches = details?.contactMatches ?? [];
  return <DashboardLayout><PageHeader eyebrow="Review Reports / Workbook Data" title={details?.request.requestedReportName ?? "Workbook data"} description={details ? `Request #${details.request.id} · ${details.properties.map(property => property.name).join(", ") || "Portfolio request"}` : "Opening the preserved report workbook."} action={<Button asChild variant="outline" size="sm"><Link href="/library"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Report library</Link></Button>} />
    {loadingDetails ? <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#087365]" />Loading report data…</div> : !details ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">This completed report is unavailable.</div> : <div className="space-y-5"><section className="rounded-2xl border border-emerald-100 bg-[#effaf7] p-5"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#087365]" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087365]">Manager contacts</p><h2 className="mt-1 text-base font-semibold text-[#063e36]">Property and regional contacts</h2></div></div>{contactMatches.some(match => match.propertyContacts.length || match.regionalContacts.length) ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{contactMatches.flatMap(match => [<>{match.propertyContacts.map(contact => <ContactCard key={`property-${contact.email ?? contact.recordName ?? "contact"}`} contact={contact} role={`Property manager · ${match.propertyName}`} />)}</>, <>{match.regionalContacts.map(contact => <ContactCard key={`regional-${contact.email ?? contact.recordName ?? "contact"}`} contact={contact} role={`Regional manager · ${match.matchedRegion ?? "Assigned region"}`} />)}</>])}</div> : <p className="mt-3 text-sm text-[#356e65]">No matching property or regional contact was found in the authorized directory.</p>}</section>
      {workbook ? <Button asChild variant="outline" size="sm"><a href={workbook.storageUrl} target="_blank" rel="noreferrer"><FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />Open preserved original workbook</a></Button> : null}
      {loadError ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6"><p className="text-sm font-semibold text-rose-900">Workbook data is unavailable</p><p className="mt-1 text-sm text-rose-800">{loadError} Use the preserved-original link above to open the source file.</p></section> : !sheets.length ? <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#087365]" />Loading actual workbook data…</div> : <WorkbookGrid sheets={sheets} />}</div>}</DashboardLayout>;
}
