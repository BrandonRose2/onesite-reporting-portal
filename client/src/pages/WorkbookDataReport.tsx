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

function WorkbookGrid({ sheets }: { sheets: SheetData[] }) {
  const [activeSheet, setActiveSheet] = useState(0);
  const rows = sheets[activeSheet]?.rows ?? [];
  const columnCount = useMemo(() => Math.max(1, ...rows.map(row => row.length)), [rows]);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="border-b border-slate-100 px-4 pt-3 sm:px-5"><div className="flex gap-1 overflow-x-auto">{sheets.map((sheet, index) => <button key={sheet.name} onClick={() => setActiveSheet(index)} className={`shrink-0 rounded-t-lg px-3 py-2 text-xs font-semibold ${activeSheet === index ? "bg-[#edf7f6] text-[#087365]" : "text-slate-500 hover:bg-slate-50"}`}>{sheet.name}</button>)}</div></div><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5"><div><p className="text-sm font-semibold text-slate-900">{sheets[activeSheet]?.name ?? "Workbook data"}</p><p className="mt-0.5 text-xs text-slate-500">{rows.length.toLocaleString()} rows · {columnCount} columns · Actual values from the filed source workbook</p></div></div><div className="max-h-[68vh] overflow-auto"><table className="min-w-full border-collapse text-left text-xs"><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className={rowIndex === 0 ? "bg-slate-50 font-semibold text-slate-700" : "text-slate-600"}><th scope="row" className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-right text-[10px] font-bold text-slate-400">{rowIndex + 1}</th>{Array.from({ length: columnCount }, (_, columnIndex) => <td key={columnIndex} className="max-w-80 border-b border-r border-slate-100 px-3 py-2 align-top whitespace-pre-wrap">{String(row[columnIndex] ?? "")}</td>)}</tr>)}</tbody></table>{!rows.length ? <p className="p-8 text-center text-sm text-slate-500">This worksheet has no displayable cells.</p> : null}</div></section>;
}

export default function WorkbookDataReport() {
  const [, params] = useRoute("/report-data/:id");
  const requestId = Number(params?.id);
  const { data: details, isLoading: loadingDetails } = trpc.requests.details.useQuery({ id: requestId || 1 }, { enabled: Number.isInteger(requestId) && requestId > 0 });
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const workbook = details?.documents.filter(document => isWorkbook(document.originalFilename)).at(-1);
  const renderedHtml = details?.documents.find(document => document.documentKind === "workbook_html" && document.mimeType === "text/html");

  useEffect(() => {
    let active = true;
    if (!workbook || renderedHtml) return;
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
  }, [workbook?.storageUrl, renderedHtml]);

  const contactMatches = details?.contactMatches ?? [];
  return <DashboardLayout><PageHeader eyebrow="Review Reports / Workbook Data" title={details?.request.requestedReportName ?? "Workbook data"} description={details ? `Request #${details.request.id} · ${details.properties.map(property => property.name).join(", ") || "Portfolio request"}` : "Opening the preserved report workbook."} action={<Button asChild variant="outline" size="sm"><Link href="/library"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Report library</Link></Button>} />
    {loadingDetails ? <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#087365]" />Loading report data…</div> : !details ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">This completed report is unavailable.</div> : <div className="space-y-5"><section className="rounded-2xl border border-emerald-100 bg-[#effaf7] p-5"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[#087365]" /><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087365]">Manager contacts</p><h2 className="mt-1 text-base font-semibold text-[#063e36]">Property and regional contacts</h2></div></div>{contactMatches.some(match => match.propertyContacts.length || match.regionalContacts.length) ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{contactMatches.flatMap(match => [<>{match.propertyContacts.map(contact => <ContactCard key={`property-${contact.email ?? contact.recordName ?? "contact"}`} contact={contact} role={`Property manager · ${match.propertyName}`} />)}</>, <>{match.regionalContacts.map(contact => <ContactCard key={`regional-${contact.email ?? contact.recordName ?? "contact"}`} contact={contact} role={`Regional manager · ${match.matchedRegion ?? "Assigned region"}`} />)}</>])}</div> : <p className="mt-3 text-sm text-[#356e65]">No matching property or regional contact was found in the authorized directory.</p>}</section>
      {workbook ? <Button asChild variant="outline" size="sm"><a href={workbook.storageUrl} target="_blank" rel="noreferrer"><FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />Open preserved original workbook</a></Button> : null}
      {renderedHtml ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><iframe title={`${details.request.requestedReportName} workbook data`} src={renderedHtml.storageUrl} className="h-[72vh] w-full border-0 bg-white" /></section> : loadError ? <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6"><p className="text-sm font-semibold text-rose-900">Workbook data is unavailable</p><p className="mt-1 text-sm text-rose-800">{loadError} Use the preserved-original link above to open the source file.</p></section> : !sheets.length ? <div className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#087365]" />Loading actual workbook data…</div> : <WorkbookGrid sheets={sheets} />}</div>}</DashboardLayout>;
}
