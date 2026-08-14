import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCard, Panel, currency } from "@/components/delinquency-ui";
import { Building2, ClipboardCheck, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const regionOptions = ["All regions", "Region 1", "Region 2", "Region 3", "Region 4"];

export const availabilityReportByExternalId: Record<string, string> = {
  "1181003": "1181003_Anaheim Gardens_Availability_1954054.pdf",
  "1181004": "1181004_Fairfax Sr Apartments_Availability_1954055.pdf",
  "1181005": "1181005_Midtown Manor_Availability_1954056.pdf",
  "1181006": "1181006_Urban Rehab_Availability_1954057.pdf",
  "1482145": "1482145_Boca Ciega Townhomes_Availability_1954058.pdf",
  "2312055": "2312055_Jefferson Arms Apts_Availability_1954059.pdf",
  "2432257": "2432257_Macedonia Gardens_Availability_1954060.pdf",
  "2836023": "2836023_135th Street Apartments_Availability_1954062.pdf",
  "2934332": "2934332_New Wilmington Arms_Availability_1954063.pdf",
  "3073874": "3073874_Holiday Apartments_Availability_1954064.pdf",
  "3156041": "3156041_Cumberland Apartments_Availability_1954065.pdf",
  "3835626": "3835626_Grace Townhomes_Availability_1954066.pdf",
  "3927823": "3927823_Lexington Arms_Availability_1954067.pdf",
  "3927824": "3927824_Breckenridge Village_Availability_1954068.pdf",
  "3990059": "3990059_Granite Ridge Apartments_Availability_1954069.pdf",
  "3990061": "3990061_Pacific Pointe Apartments_Availability_1954070.pdf",
  "4022593": "4022593_Historical - Riverchase Homes_Availability_1954071.pdf",
  "4160082": "4160082_Silver Springs Terrace_Availability_1954072.pdf",
  "4233753": "4233753_Windsor Village_Availability_1954073.pdf",
  "4233754": "4233754_Yorkshire Apartments_Availability_1954074.pdf",
  "4276597": "4276597_Marrero 3 LP_Availability_1954075.pdf",
  "4304099": "4304099_Arbor Crest_Availability_1954076.pdf",
  "4371422": "4371422_St Charles_Availability_1954077.pdf",
  "4573141": "4573141_Thomasville Church Homes_Availability_1954078.pdf",
  "4679872": "4679872_Grove Park Terrace_Availability_1954079.pdf",
  "4859069": "4859069_Coral Village_Availability_1954080.pdf",
  "4992471": "4992471_North Pointe_Availability_1954081.pdf",
  "5083727": "5083727_Granite Elmwood Indiana Homes_Availability_1954082.pdf",
  "5159418": "5159418_Granite Valencia Villas_Availability_1954083.pdf",
  "5204960": "5204960_Bayou Pointe_Availability_1954084.pdf",
  "5313974": "5313974_Howell Place_Availability_1954085.pdf",
  "5313976": "5313976_Pelican Bay_Availability_1954086.pdf",
  "5313977": "5313977_Pirates Bend_Availability_1954087.pdf",
  "5414947": "5414947_Walnut Hill_Availability_1954088.pdf",
  "5661023": "5661023_Crossroads of Lees Summit_Availability_1954089.pdf",
};

export const managerChecklistPackageByExternalId = Object.fromEntries(
  Object.entries(availabilityReportByExternalId).map(([externalId, availabilityFilename]) => [externalId, { availabilityFilename, delinquencyExportCount: 2 as const }])
) as Record<string, { availabilityFilename: string; delinquencyExportCount: 2 }>;

export default function ManagerChecklists() {
  const [, setLocation] = useLocation();
  const periodsQuery = trpc.delinquency.periods.useQuery();
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All regions");
  const periodId = selectedPeriodId ?? periodsQuery.data?.[0]?.id;
  const dashboardQuery = trpc.delinquency.managerDashboard.useQuery(
    periodId ? { reportingPeriodId: periodId } : undefined,
    { enabled: Boolean(periodId) }
  );

  const rows = useMemo(() => {
    const properties = dashboardQuery.data?.regions.flatMap(item => item.properties) ?? [];
    return properties.filter(property => {
      const term = search.trim().toLowerCase();
      const searchMatch = !term || `${property.name} ${property.externalId}`.toLowerCase().includes(term);
      const regionMatch = region === "All regions" || property.region === region;
      return searchMatch && regionMatch;
    });
  }, [dashboardQuery.data, region, search]);

  if (periodsQuery.isLoading || dashboardQuery.isLoading) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Loading manager checklists…</div>;
  }

  const period = dashboardQuery.data?.period;
  const metrics = dashboardQuery.data?.metrics;

  return <div className="space-y-6">
    <section className="rounded-[1.5rem] bg-[#122b4b] px-6 py-7 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a9d8d1]">Manager outreach workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Delinquency & availability checklists</h1>
          <p className="mt-3 text-sm leading-6 text-slate-200">Open a property checklist to document the manager call, confirm availability, and work resident balances from the current reporting period.</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
          <p className="text-xs text-slate-300">Current reporting period</p>
          <p className="mt-1 font-semibold">{period ? `${period.fiscalPeriod} · ${new Date(period.asOfDate).toLocaleDateString()}` : "No loaded period"}</p>
        </div>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Available checklists" value={String(dashboardQuery.data?.regions.flatMap(item => item.properties).length ?? 0)} detail="One workspace per loaded property" icon={ClipboardCheck} tone="navy" />
      <MetricCard label="Resident accounts" value={String(metrics?.residentCount ?? 0)} detail="Across the selected period" icon={UsersRound} tone="teal" />
      <MetricCard label="Net owed" value={currency(metrics?.netBalance)} detail="Prioritize positive balances" icon={Building2} tone="rose" />
      <MetricCard label="90+ exposure" value={currency(metrics?.days90PlusAmount)} detail="Escalation review area" icon={ShieldCheck} tone="amber" />
    </section>

    <Panel eyebrow="Find a property" title="Manager checklist directory" action={<span className="text-xs text-slate-500">{rows.length} properties shown</span>}>
      <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-[minmax(0,1fr)_12rem_13rem] md:p-6">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search property or ID" className="pl-9" /></div>
        <Select value={region} onValueChange={setRegion}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{regionOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
        <Select value={String(periodId ?? "")} onValueChange={value => setSelectedPeriodId(Number(value))}><SelectTrigger><SelectValue placeholder="Reporting period" /></SelectTrigger><SelectContent>{periodsQuery.data?.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map(property => <button key={property.id} onClick={() => setLocation(`/manager-checklists/${property.id}?period=${periodId}`)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-4 text-left transition-colors hover:bg-[#f7fafc] sm:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem_auto] sm:items-center sm:px-6">
          <div><p className="font-semibold text-[#122b4b]">{property.name}</p><p className="mt-1 text-xs text-slate-500">{property.region} · ID {property.externalId} · {property.residentCount} resident accounts</p><p className="mt-1 truncate text-[10px] text-slate-400">Checklist workspace · {managerChecklistPackageByExternalId[property.externalId]?.availabilityFilename ?? "Availability report"} · {managerChecklistPackageByExternalId[property.externalId]?.delinquencyExportCount ?? 0} cross-referenced delinquency exports</p></div>
          <div className="hidden text-right sm:block"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Net owed</p><p className="mt-1 text-sm font-semibold text-[#122b4b]">{currency(property.netBalance)}</p></div>
          <div className="hidden text-right sm:block"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">90+ days</p><p className="mt-1 text-sm font-semibold text-[#b44851]">{currency(property.days90PlusAmount)}</p></div>
          <div className="hidden text-right sm:block"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Delinquent</p><p className="mt-1 text-sm font-semibold text-[#122b4b]">{property.delinquentUnits} units</p></div>
          <span className="rounded-full bg-[#eaf5f3] px-3 py-1.5 text-xs font-semibold text-[#0c7469]">Open checklist</span>
        </button>)}
        {!rows.length ? <div className="px-6 py-12 text-center text-sm text-slate-500">No properties match these filters.</div> : null}
      </div>
    </Panel>
  </div>;
}
