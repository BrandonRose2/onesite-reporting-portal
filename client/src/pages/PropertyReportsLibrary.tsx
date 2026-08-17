import { Panel } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Archive, ChevronRight, ClipboardCheck, FileText, FolderOpen, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type FolderProperty = { id: number; name: string; region: string };

function filedAt(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function reportKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function canonicalReportKey(value: string) {
  return /delinquent\s+and\s+prepaid/i.test(value) ? reportKey("Delinquency") : reportKey(value);
}

export default function PropertyReportsLibrary() {
  const [, setLocation] = useLocation();
  const dashboardQuery = trpc.delinquency.managerDashboard.useQuery();
  const documentsQuery = trpc.onesiteReporting.documents.useQuery();
  const catalogQuery = trpc.onesiteReporting.catalog.useQuery();
  const documentUrlMutation = trpc.onesiteReporting.documentUrl.useMutation();
  const periodsQuery = trpc.delinquency.periods.useQuery();
  const [propertySearch, setPropertySearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [showAllReportFolders, setShowAllReportFolders] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedReportKey, setSelectedReportKey] = useState<string | null>(null);
  const properties: FolderProperty[] = dashboardQuery.data?.regions.flatMap(region => region.properties) ?? [];
  const filteredProperties = useMemo(() => {
    const query = propertySearch.trim().toLowerCase();
    return properties.filter(property => !query || `${property.name} ${property.region}`.toLowerCase().includes(query));
  }, [properties, propertySearch]);
  const activePropertyId = selectedPropertyId && properties.some(property => property.id === selectedPropertyId) ? selectedPropertyId : filteredProperties[0]?.id ?? null;
  const activeProperty = properties.find(property => property.id === activePropertyId) ?? null;
  const propertyDocuments = useMemo(() => (documentsQuery.data ?? []).filter(document => document.propertyId === activePropertyId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [documentsQuery.data, activePropertyId]);
  const reportFolders = useMemo(() => {
    const mapped = (catalogQuery.data ?? []).map(report => {
      const documents = propertyDocuments.filter(document => document.reportCatalogId === report.id || (document.catalogExactReportName === report.exactReportName && (document.catalogReportArea ?? "") === (report.reportArea ?? "") && (document.catalogReportLevel ?? "") === (report.reportLevel ?? "") && (document.catalogProduct ?? "") === (report.product ?? "")) || (reportKey(report.exactReportName) === reportKey("Delinquency") && canonicalReportKey(document.requestedReportName) === reportKey("Delinquency")));
      const label = (catalogQuery.data ?? []).filter(item => item.displayName === report.displayName).length > 1 && report.reportArea ? `${report.displayName} · ${report.reportArea}` : report.displayName;
      return { id: `catalog-${report.id}`, label, area: report.reportArea, documents, latest: documents[0]?.createdAt ?? null };
    });
    const catalogKeys = new Set((catalogQuery.data ?? []).flatMap(report => [canonicalReportKey(report.displayName), canonicalReportKey(report.exactReportName)]));
    const historical = Object.entries(propertyDocuments.reduce<Record<string, typeof propertyDocuments>>((groups, document) => {
      const key = canonicalReportKey(document.requestedReportName);
      if (!catalogKeys.has(key)) (groups[document.requestedReportName] ??= []).push(document);
      return groups;
    }, {})).map(([label, documents]) => ({ id: `history-${reportKey(label)}`, label, area: "Historical filing", documents, latest: documents[0]?.createdAt ?? null }));
    return [...mapped, ...historical].sort((a, b) => Number(Boolean(b.documents.length)) - Number(Boolean(a.documents.length)) || a.label.localeCompare(b.label));
  }, [catalogQuery.data, propertyDocuments]);
  const visibleReportFolders = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reportFolders.filter(folder => (showAllReportFolders || folder.documents.length > 0) && (!query || `${folder.label} ${folder.area ?? ""}`.toLowerCase().includes(query)));
  }, [reportFolders, reportSearch, showAllReportFolders]);
  const activeReportFolder = reportFolders.find(folder => folder.id === selectedReportKey) ?? visibleReportFolders[0] ?? null;
  const generatedReports = activeReportFolder?.documents.filter(document => document.documentKind === "property_workbook") ?? [];
  const sourceEvidence = activeReportFolder?.documents.filter(document => document.documentKind === "source_report") ?? [];
  const openDocument = (documentId: number) => {
    const document = propertyDocuments.find(item => item.id === documentId);
    if (document?.documentKind === "property_workbook" && activeProperty) {
      setLocation(`/property-reports/${activeProperty.id}?request=${document.reportRequestId}&period=${periodsQuery.data?.[0]?.id ?? ""}`);
      return;
    }
    const target = window.open("", "_blank");
    if (target) target.opener = null;
    documentUrlMutation.mutate({ documentId }, { onSuccess: ({ url }) => target ? target.location.replace(url) : window.location.assign(url), onError: () => target?.close() });
  };

  useEffect(() => { setSelectedReportKey(null); setReportSearch(""); }, [activePropertyId]);

  if (dashboardQuery.isLoading || documentsQuery.isLoading || catalogQuery.isLoading) return <Skeleton className="h-[34rem] rounded-[1.25rem]" />;
  return <div className="space-y-6">
    <section className="rounded-[1.5rem] bg-[#122b4b] p-6 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:p-7"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">Timestamped filing workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Property Reports Library</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">Each property has report-type subfolders. A completed run files its AptCorp output, source evidence, and exact date/time in the matching folder automatically.</p></section>
    <section className="grid gap-6 xl:grid-cols-[280px_310px_minmax(0,1fr)]">
      <Panel eyebrow="Property folders" title={`${filteredProperties.length} active properties`}><div className="border-b border-slate-100 p-4"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={propertySearch} onChange={event => setPropertySearch(event.target.value)} placeholder="Find a property" className="pl-9" /></div></div><div className="max-h-[calc(100vh-24rem)] divide-y divide-slate-100 overflow-y-auto">{filteredProperties.map(property => { const count = (documentsQuery.data ?? []).filter(document => document.propertyId === property.id && document.documentKind === "property_workbook").length; const selected = property.id === activePropertyId; return <button key={property.id} type="button" onClick={() => setSelectedPropertyId(property.id)} className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${selected ? "bg-[#eaf5f3]" : "hover:bg-slate-50"}`}><span className="flex min-w-0 items-center gap-2"><FolderOpen className={`h-4 w-4 shrink-0 ${selected ? "text-[#0c7469]" : "text-slate-400"}`} /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#122b4b]">{property.name}</span><span className="mt-0.5 block text-xs text-slate-500">{property.region}</span></span></span><Badge variant="outline" className="shrink-0">{count}</Badge></button>; })}</div></Panel>
      <Panel eyebrow="Report subfolders" title={activeProperty ? activeProperty.name : "Choose a property"}>{activeProperty ? <><div className="space-y-3 border-b border-slate-100 p-4"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={reportSearch} onChange={event => setReportSearch(event.target.value)} placeholder="Find a report folder" className="pl-9" /></div><label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={showAllReportFolders} onChange={event => setShowAllReportFolders(event.target.checked)} className="h-4 w-4 accent-[#0c7469]" />Show all available report folders ({reportFolders.length})</label></div><div className="max-h-[calc(100vh-24rem)] divide-y divide-slate-100 overflow-y-auto">{visibleReportFolders.map(folder => { const selected = folder.id === activeReportFolder?.id; return <button key={folder.id} type="button" onClick={() => setSelectedReportKey(folder.id)} className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${selected ? "bg-[#eaf5f3]" : "hover:bg-slate-50"}`}><span className="flex min-w-0 items-center gap-2"><FolderOpen className={`h-4 w-4 shrink-0 ${selected ? "text-[#0c7469]" : "text-slate-400"}`} /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#122b4b]">{folder.label}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{folder.latest ? `Last filed ${filedAt(folder.latest)}` : folder.area ?? "Empty report folder"}</span></span></span><Badge variant="outline" className="shrink-0">{folder.documents.length}</Badge></button>; })}{!visibleReportFolders.length ? <div className="p-6 text-center text-sm text-slate-500">No report subfolders match that search.</div> : null}</div></> : <div className="p-7 text-center text-sm text-slate-500">Choose a property folder first.</div>}</Panel>
      <Panel eyebrow="Timestamped contents" title={activeReportFolder ? activeReportFolder.label : "Choose a report subfolder"}>{activeProperty && activeReportFolder ? <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><p className="text-sm font-semibold text-[#122b4b]">{activeProperty.name} / {activeReportFolder.label}</p><p className="mt-1 text-xs text-slate-500">Every completed run files chronologically in this subfolder.</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setLocation(`/properties/${activeProperty.id}`)}>Property profile</Button><Button size="sm" className="hunter-metal-button" onClick={() => setLocation(`/manager-checklists/${activeProperty.id}?period=${periodsQuery.data?.[0]?.id ?? ""}`)}><ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />Checklist</Button></div></div><div className="divide-y divide-slate-100">{generatedReports.map(document => <div key={document.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="flex min-w-0 items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf5f3] text-[#0c7469]"><FileText className="h-5 w-5" /></div><div className="min-w-0"><Badge className="bg-[#0c7469] text-white hover:bg-[#0c7469]">AptCorp report</Badge><p className="mt-2 text-sm font-semibold text-[#122b4b]">{document.originalFilename}</p><p className="mt-1 text-xs text-slate-500">Filed {filedAt(document.createdAt)} · generated property output</p></div></div><Button onClick={() => openDocument(document.id)} disabled={documentUrlMutation.isPending} className="hunter-metal-button">Open report</Button></div>)}{!generatedReports.length ? <div className="p-8 text-center"><Archive className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-[#122b4b]">This report subfolder is ready for its first run.</p><p className="mt-1 text-sm text-slate-500">When this report is generated for this property, its timestamped AptCorp output will file here automatically.</p></div> : null}</div>{sourceEvidence.length ? <details className="border-t border-slate-100 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-600">Retained raw OneSite source evidence ({sourceEvidence.length})</summary><div className="mt-3 space-y-2">{sourceEvidence.map(document => <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-xs"><span className="min-w-0 truncate text-slate-600">Filed {filedAt(document.createdAt)} · {document.originalFilename}</span><Button size="sm" variant="outline" onClick={() => openDocument(document.id)} disabled={documentUrlMutation.isPending}>Open source</Button></div>)}</div></details> : null}</> : <div className="p-8 text-center text-sm text-slate-500">Choose a report subfolder to view timestamped files.</div>}</Panel>
    </section>
  </div>;
}
