import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type FiledDocument = {
  id: number;
  source: "onesite" | "yardi";
  storageUrl: string;
  originalFilename: string;
  propertyName: string;
  mimeType: string;
  documentKind: "source_report" | "property_workbook" | "workbook_html" | "manager_checklist";
};

const workbookExtensions = /\.(xlsx|xls|xlsm|csv)$/i;
const normalizeCell = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const isBlankWorkbookRow = (row: unknown[]) => row.every(value => !String(value ?? "").trim());
const findManagementHeader = (rows: unknown[][]) => rows.findIndex(row => {
  const rowText = row.map(normalizeCell).join(" ");
  return rowText.includes("total delinquent") && (rowText.includes("bldg unit") || rowText.includes("unit"));
});

export function DocumentViewer({ document }: { document: FiledDocument }) {
  const [open, setOpen] = useState(false);
  const isPdf = document.mimeType.includes("pdf") || /\.pdf$/i.test(document.originalFilename);
  const isWorkbook = !isPdf && (document.mimeType.includes("spreadsheet") || document.mimeType.includes("excel") || document.mimeType.includes("csv") || workbookExtensions.test(document.originalFilename));
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><button className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0b8775] focus-visible:ring-offset-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#edf7f6] text-[#087365]">{isWorkbook ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-700">{document.originalFilename}</span><span className="mt-0.5 block text-[10px] text-slate-400">{document.propertyName} · {document.source === "onesite" ? "OneSite Reporting" : "Yardi Reporting"}</span></span></button></DialogTrigger><DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none p-0 sm:h-[86vh] sm:max-w-6xl sm:rounded-lg"><DialogHeader className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5"><div className="flex items-start justify-between gap-3 pr-7 sm:gap-4"><div className="min-w-0"><DialogTitle className="truncate text-sm sm:text-base">{document.originalFilename}</DialogTitle><DialogDescription className="mt-1 text-xs">Original {document.source === "onesite" ? "OneSite" : "Yardi"} report preserved under {document.propertyName}.</DialogDescription></div><Button asChild size="sm" variant="outline" className="shrink-0 px-2.5 sm:px-3"><a href={document.storageUrl} target="_blank" rel="noreferrer"><Download className="h-3.5 w-3.5 sm:mr-1.5" /><span className="sr-only sm:not-sr-only">Original file</span></a></Button></div></DialogHeader><div className="min-h-0 flex-1 bg-slate-50">{isPdf ? <iframe title={document.originalFilename} src={document.storageUrl} className="h-full w-full border-0 bg-white" /> : isWorkbook ? <WorkbookPreview document={document} /> : <div className="grid h-full place-items-center p-6 text-center sm:p-8"><div><FileText className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-800">Original file preserved</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">This file type is available for download. Use the original-file button to open it in your local application.</p></div></div>}</div></DialogContent></Dialog>;
}

export function ReportSummaryViewer({ html, requestId, reportName }: { html?: string; requestId?: number; reportName: string }) {
  const [open, setOpen] = useState(false);
  const resolvedRequestId = requestId ?? Number(html?.match(/Request #(\d+)/)?.[1]);
  const summaryUrl = Number.isInteger(resolvedRequestId) && resolvedRequestId > 0 ? `/report-data/${resolvedRequestId}` : undefined;
  if (!summaryUrl) return null;
  return <Button asChild variant="outline" size="sm" className="mt-2 w-full sm:w-auto"><a href={summaryUrl}>Open workbook data as HTML</a></Button>;
}

function WorkbookPreview({ document }: { document: FiledDocument }) {
  const [sheets, setSheets] = useState<Array<{ name: string; rows: unknown[][] }>>([]);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setSheets([]); setSelectedSheet(0);
    void (async () => {
      try {
        const response = await fetch(document.storageUrl);
        if (!response.ok) throw new Error("The original workbook could not be loaded for preview.");
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await response.arrayBuffer(), { type: "array" });
        const parsed = workbook.SheetNames.map(name => ({ name, rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: "" }).slice(0, 150).map(row => row.slice(0, 30)) }));
        const managementSheetIndex = parsed.findIndex(sheet => findManagementHeader(sheet.rows) >= 0);
        if (active) { setSheets(parsed); setSelectedSheet(managementSheetIndex >= 0 ? managementSheetIndex : 0); }
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : "Workbook preview is unavailable."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [document.storageUrl]);

  const sourceRows = sheets[selectedSheet]?.rows ?? [];
  const headerIndex = useMemo(() => findManagementHeader(sourceRows), [sourceRows]);
  const rows = useMemo(() => (headerIndex >= 0 ? sourceRows.slice(headerIndex) : sourceRows).filter(row => !isBlankWorkbookRow(row)), [headerIndex, sourceRows]);
  const headers = rows[0] ?? [];
  const detailRows = rows.slice(1);
  const columnCount = useMemo(() => Math.max(1, ...rows.map(row => row.length)), [rows]);
  if (loading) return <div className="grid h-full place-items-center text-sm text-slate-500"><div className="text-center"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[#087365]" />Loading workbook preview…</div></div>;
  if (error) return <div className="grid h-full place-items-center p-8 text-center"><div><FileSpreadsheet className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-800">Workbook preview unavailable</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{error} The original workbook remains available from the download button.</p></div></div>;
  const activeSheetName = sheets[selectedSheet]?.name ?? "Workbook data";
  return <div className="flex h-full min-h-0 flex-col"><div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087365]">Management workbook preview</p><p className="mt-0.5 text-xs font-semibold text-slate-700">{activeSheetName}{headerIndex >= 0 ? " · data table" : ""}</p></div>{sheets.length > 1 ? <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Worksheet<select value={selectedSheet} onChange={event => setSelectedSheet(Number(event.target.value))} className="h-9 max-w-44 rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-xs font-semibold normal-case tracking-normal text-[#075f58] outline-none focus:border-[#087365] focus:bg-white focus:ring-2 focus:ring-[#0b8775]/20">{sheets.map((sheet, index) => <option key={sheet.name} value={index}>{index === 0 ? `${sheet.name} · Management` : sheet.name}</option>)}</select></label> : null}</div><div className="min-h-0 flex-1 overflow-auto bg-white"><table className="min-w-max border-collapse text-left text-xs"><thead><tr>{Array.from({ length: columnCount }, (_, columnIndex) => <th key={columnIndex} className="sticky top-0 z-10 min-w-28 border-b border-r border-slate-200 bg-[#effaf6] px-3 py-2 align-bottom text-[10px] font-bold uppercase tracking-[0.03em] text-[#087365]">{String(headers[columnIndex] ?? `Column ${columnIndex + 1}`)}</th>)}</tr></thead><tbody>{detailRows.map((row, rowIndex) => <tr key={rowIndex} className="text-slate-600 odd:bg-white even:bg-slate-50/50 hover:bg-emerald-50/60">{Array.from({ length: columnCount }, (_, columnIndex) => <td key={columnIndex} className="max-w-72 border-b border-r border-slate-100 px-3 py-2 align-top whitespace-pre-wrap">{String(row[columnIndex] ?? "")}</td>)}</tr>)}</tbody></table>{!rows.length ? <div className="p-8 text-center text-sm text-slate-500">This worksheet has no displayable cells.</div> : null}</div><p className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] text-slate-500">Preview starts at the report’s data header. The original-file button preserves every worksheet and original report detail.</p></div>;
}
