import { MetricCard, Panel, currency, percent } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ReportingOverviewQuickActions } from "@/components/ReportingOverviewQuickActions";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, Building2, CircleDollarSign, Download, FileSpreadsheet, Printer, RefreshCw, UsersRound, WalletCards } from "lucide-react";
import * as XLSX from "xlsx";

const regions = ["Region 1", "Region 2", "Region 3", "Region 4"];

function dateLabel(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function downloadWorkbook(rows: Array<Record<string, unknown>>, filename: string) {
  const safeRows = rows.map(({ phoneNumber, email, collectionNotes, ...row }) => row);
  const sheet = XLSX.utils.json_to_sheet(safeRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Delinquency Detail");
  XLSX.writeFile(workbook, filename);
}

function downloadCsv(rows: Array<Record<string, unknown>>, filename: string) {
  const safeRows = rows.map(({ phoneNumber, email, collectionNotes, ...row }) => row);
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(safeRows));
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const periodsQuery = trpc.delinquency.periods.useQuery();
  const [periodId, setPeriodId] = useState<number | undefined>();
  const periods = periodsQuery.data ?? [];
  useEffect(() => {
    if (!periodId && periods[0]) setPeriodId(periods[0].id);
  }, [periodId, periods]);
  const dashboardQuery = trpc.delinquency.dashboard.useQuery(periodId ? { reportingPeriodId: periodId } : undefined);
  const exportQuery = trpc.delinquency.exportRows.useQuery({ reportingPeriodId: periodId ?? 0 }, { enabled: false });
  const dashboard = dashboardQuery.data;
  const metrics = dashboard?.metrics;
  const isLoading = periodsQuery.isLoading || dashboardQuery.isLoading;
  const propertyCount = dashboard?.regions.reduce((total, region) => total + region.properties.length, 0) ?? 0;
  const delinquencyRate = metrics?.residentCount ? metrics.delinquentUnits / metrics.residentCount : 0;
  const aging = useMemo(() => [
    { label: "Current", value: metrics?.currentAmount ?? 0, color: "bg-[#0c7469]" },
    { label: "30 Days", value: metrics?.days30Amount ?? 0, color: "bg-[#39729f]" },
    { label: "60 Days", value: metrics?.days60Amount ?? 0, color: "bg-[#c17d19]" },
    { label: "90+ Days", value: metrics?.days90PlusAmount ?? 0, color: "bg-[#b44851]" },
  ], [metrics]);
  const agingTotal = aging.reduce((total, bucket) => total + Math.max(bucket.value, 0), 0);

  const handleExport = async () => {
    if (!periodId) return;
    const result = await exportQuery.refetch();
    if (result.data) downloadWorkbook(result.data as Array<Record<string, unknown>>, `delinquency-report-${dateLabel(dashboard?.period?.asOfDate ?? new Date()).replace(/\s/g, "-")}.xlsx`);
  };
  const handleCsvExport = async () => {
    if (!periodId) return;
    const result = await exportQuery.refetch();
    if (result.data) downloadCsv(result.data as Array<Record<string, unknown>>, `delinquency-report-${dateLabel(dashboard?.period?.asOfDate ?? new Date()).replace(/\s/g, "-")}.csv`);
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-32 rounded-[1.25rem]" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-[1.25rem]" />)}</div></div>;

  if (!dashboard?.period) return <section className="grid min-h-[65vh] place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
    <div className="max-w-md"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf5f3] text-[#0c7469]"><FileSpreadsheet className="h-7 w-7" /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#0c7469]">Initial reporting period</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#122b4b]">Your portfolio is ready for its first import.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Upload the 35 Delinquent and Prepaid XLS exports to build the Fiscal Period 04/2026 snapshot. The portal will preserve each source file and make the history auditable from day one.</p><Button onClick={() => setLocation("/refresh")} className="mt-6 bg-[#0c7469] hover:bg-[#095e56]"><RefreshCw className="mr-2 h-4 w-4" />Run Scraper</Button></div>
  </section>;

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[1.5rem] bg-[#122b4b] px-5 py-6 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:px-7">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a9d8d1]">Apartment Corp Portfolio</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">Reporting Operations</h1><p className="mt-2 max-w-2xl text-sm text-slate-200">A secure operations center for requesting, filing, analyzing, and following up on portfolio reports.</p></div>
        <div className="flex flex-wrap items-center gap-2 print-exclude"><Badge className="border border-white/15 bg-white/10 px-2.5 py-1 text-white hover:bg-white/10">Fiscal Period {dashboard.period.fiscalPeriod}</Badge><Badge className="border border-white/15 bg-white/10 px-2.5 py-1 text-white hover:bg-white/10">As of {dateLabel(dashboard.period.asOfDate)}</Badge><Select value={String(periodId)} onValueChange={value => setPeriodId(Number(value))}><SelectTrigger className="h-9 min-w-[190px] border-white/15 bg-white/10 text-xs text-white"><SelectValue /></SelectTrigger><SelectContent>{periods.map(period => <SelectItem key={period.id} value={String(period.id)}>{period.name}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => window.print()} className="h-9 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Printer className="mr-2 h-3.5 w-3.5" />Print</Button><Button variant="outline" onClick={handleCsvExport} className="h-9 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><Download className="mr-2 h-3.5 w-3.5" />CSV</Button><Button onClick={handleExport} className="h-9 bg-[#d6ad50] text-[#122b4b] hover:bg-[#e5c36f]"><Download className="mr-2 h-3.5 w-3.5" />Excel</Button></div>
      </div>
    </section>

    <ReportingOverviewQuickActions onNavigate={setLocation} />

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Net Delinquent" value={currency(metrics?.netDelinquent)} detail={`${metrics?.delinquentUnits ?? 0} delinquent units`} icon={CircleDollarSign} tone="rose" /><MetricCard label="Net Prepaid" value={currency(metrics?.netPrepaid)} detail="Resident credits and prepaid balances" icon={WalletCards} tone="teal" /><MetricCard label="Resident Accounts" value={String(metrics?.residentCount ?? 0)} detail={`${propertyCount} of 35 entities loaded`} icon={UsersRound} tone="navy" /><MetricCard label="Delinquency Rate" value={percent(delinquencyRate)} detail="Delinquent units / resident accounts" icon={Building2} tone="amber" /></section>

    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><Panel eyebrow="Delinquency snapshot" title="Aging concentration" action={<span className="text-xs text-slate-500">Total reported balance {currency(metrics?.netBalance)}</span>}><div className="space-y-4 p-5 sm:p-6">{aging.map(bucket => { const share = agingTotal ? Math.max(bucket.value, 0) / agingTotal * 100 : 0; return <div key={bucket.label}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">{bucket.label}</span><span className="font-semibold text-[#122b4b]">{currency(bucket.value)} <span className="font-normal text-slate-400">{share.toFixed(1)}%</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${share}%` }} /></div></div>; })}</div></Panel><Panel eyebrow="Delinquency data controls" title="Reporting integrity"><div className="space-y-4 p-5 sm:p-6"><div className="rounded-xl bg-[#f3f7fb] p-4"><p className="text-sm font-semibold text-[#122b4b]">{dashboard.period.sourceFileCount} source reports archived</p><p className="mt-1 text-xs leading-5 text-slate-600">Each property’s original filename, import timestamp, and checksum are retained with this period.</p></div><div className="flex items-start gap-3 rounded-xl border border-[#ead8ad] bg-[#fffaf0] p-4"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b7791f]" /><p className="text-xs leading-5 text-[#76521d]">Totals should be reviewed against the source reports after each import. Use the source file indicator on property detail pages to trace records back to their original export.</p></div><Button onClick={() => setLocation("/refresh")} className="w-full hunter-metal-button"><RefreshCw className="mr-2 h-4 w-4" />Open delinquency import</Button></div></Panel></section>

    <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-3 px-1"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0c7469]">Delinquency reporting module</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#122b4b]">Current property snapshot</h2></div><p className="text-xs text-slate-500">Loaded fiscal period {dashboard.period.fiscalPeriod}</p></div>{regions.map(regionName => { const region = dashboard.regions.find(item => item.region === regionName); const properties = region?.properties ?? []; return <Panel key={regionName} eyebrow={regionName} title={`${properties.length} properties in current import`} action={<span className="text-sm font-semibold text-[#122b4b]">{currency(region?.metrics.netBalance)}</span>}><div className="grid divide-y divide-slate-100">{properties.length ? properties.map(property => <button key={property.id} onClick={() => setLocation(`/properties/${property.id}?period=${dashboard.period.id}`)} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-4 text-left transition-colors hover:bg-[#f7fafc] sm:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem] sm:items-center sm:px-6"><div><p className="font-semibold text-[#122b4b]">{property.name}</p><p className="mt-1 text-xs text-slate-500">ID {property.externalId} · {property.delinquentUnits} delinquent units</p></div><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Net balance</p><p className="mt-1 font-semibold text-[#122b4b]">{currency(property.netBalance)}</p></div><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">90+ exposure</p><p className="mt-1 font-semibold text-[#b44851]">{currency(property.days90PlusAmount)}</p></div><div className="flex justify-end"><span className="rounded-full bg-[#eaf5f3] px-2.5 py-1 text-xs font-semibold text-[#0c7469]">View entity</span></div></button>) : <div className="px-6 py-5 text-sm text-slate-500">No property export is included in the current snapshot for this region.</div>}</div></Panel>; })}</section>
    <section className="print-only" aria-hidden="true"><h1>Apartment Corp Portfolio — Reporting Operations</h1><p>Delinquency snapshot · Fiscal Period {dashboard.period.fiscalPeriod} · As of {dateLabel(dashboard.period.asOfDate)}</p><div className="print-metrics"><div><strong>{currency(metrics?.netDelinquent)}</strong><span>Net Delinquent</span></div><div><strong>{currency(metrics?.netPrepaid)}</strong><span>Net Prepaid</span></div><div><strong>{metrics?.residentCount ?? 0}</strong><span>Resident Accounts</span></div><div><strong>{percent(delinquencyRate)}</strong><span>Delinquency Rate</span></div></div><table><thead><tr><th>Region</th><th>Property</th><th>Net Balance</th><th>Delinquent Units</th><th>90+ Days</th></tr></thead><tbody>{dashboard.regions.flatMap(region => region.properties.map(property => <tr key={property.id}><td>{property.region}</td><td>{property.name}</td><td>{currency(property.netBalance)}</td><td>{property.delinquentUnits}</td><td>{currency(property.days90PlusAmount)}</td></tr>))}</tbody></table></section>
  </div>;
}
