import React from "react";
import { ArrowRight, Building2, ClipboardCheck, FileOutput } from "lucide-react";
import { reportingOverviewQuickActions } from "@/lib/reportingOverview";

type Navigate = (path: string) => void;

export function createOverviewNavigationHandlers(navigate: Navigate) {
  return {
    requestReport: () => navigate(reportingOverviewQuickActions.requestReport.path),
    reviewProperties: () => navigate(reportingOverviewQuickActions.reviewProperties.path),
    managerFollowUp: () => navigate(reportingOverviewQuickActions.managerFollowUp.path),
  };
}

const cardClass = "portal-action-card group rounded-[1.25rem] p-5 text-left transition-all hover:-translate-y-0.5";

export function ReportingOverviewQuickActions({ onNavigate }: { onNavigate: Navigate }) {
  const actions = createOverviewNavigationHandlers(onNavigate);
  return <section aria-label="How to use AptCorp Property Reports" className="grid gap-4 lg:grid-cols-3 print-exclude">
    <button onClick={actions.requestReport} className={`${cardClass} border border-[#b9d8cf] bg-gradient-to-br from-[#f4fbf8] to-white shadow-[0_10px_24px_rgba(12,116,105,0.08)] hover:shadow-[0_14px_32px_rgba(12,116,105,0.14)]`}>
      <div className="flex items-start justify-between gap-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0c7469] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"><FileOutput className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-[#27735a] transition-transform group-hover:translate-x-1" /></div>
      <p className="mt-5 text-sm font-semibold text-[#122b4b]">{reportingOverviewQuickActions.requestReport.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">Search Delinquency and approved OneSite reports, configure settings, and request every property at once.</p>
    </button>
    <button onClick={actions.reviewProperties} className={`${cardClass} border border-[#d7e2ef] bg-gradient-to-br from-[#f6f9fd] to-white shadow-[0_10px_24px_rgba(28,75,125,0.07)] hover:shadow-[0_14px_32px_rgba(28,75,125,0.13)]`}>
      <div className="flex items-start justify-between gap-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1c4b7d] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"><Building2 className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-[#39729f] transition-transform group-hover:translate-x-1" /></div>
      <p className="mt-5 text-sm font-semibold text-[#122b4b]">{reportingOverviewQuickActions.reviewProperties.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">Navigate the current delinquency snapshot, archived reports, and property-level reporting context.</p>
    </button>
    <button onClick={actions.managerFollowUp} className={`${cardClass} border border-[#eadcb9] bg-gradient-to-br from-[#fffcf4] to-white shadow-[0_10px_24px_rgba(167,111,24,0.07)] hover:shadow-[0_14px_32px_rgba(167,111,24,0.13)]`}>
      <div className="flex items-start justify-between gap-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7791f] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"><ClipboardCheck className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-[#b7791f] transition-transform group-hover:translate-x-1" /></div>
      <p className="mt-5 text-sm font-semibold text-[#122b4b]">{reportingOverviewQuickActions.managerFollowUp.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">Open property checklists with manager contact details, availability notes, and resident balance follow-up.</p>
    </button>
  </section>;
}
