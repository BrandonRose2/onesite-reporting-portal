import { Panel } from "@/components/delinquency-ui";
import { Badge } from "@/components/ui/badge";
import { Building2, ShieldCheck } from "lucide-react";

export default function YardiReports() {
  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-[1.5rem] bg-[#122b4b] p-6 text-white shadow-[0_18px_50px_rgba(16,37,63,0.18)] sm:p-7">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8d1]">Future report connection</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Pull Reports – Yardi</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">This workspace is reserved for the Yardi report workflow you will demonstrate. It is intentionally separate from OneSite reporting.</p>
    </section>
    <Panel eyebrow="Yardi setup" title="Ready for your walkthrough"><div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf5f3] text-[#0c7469]"><Building2 className="h-6 w-6" /></div><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[#9acdbf] bg-[#edf9f4] text-[#166249]">No connection configured</Badge><Badge variant="outline">Manual setup pending</Badge></div><p className="mt-4 text-sm font-semibold text-[#122b4b]">Yardi credentials, report pulls, and automation have not been configured.</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">When you are ready, we will use your live Yardi walkthrough to define the report list, property scope, filters, download workflow, and filing rules before enabling any automation.</p></div></div></Panel>
    <div className="flex items-start gap-3 rounded-xl border border-[#ead8ad] bg-[#fffaf0] p-4 text-sm text-[#76521d]"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>No Yardi login details are stored in this portal, and this page does not initiate any external connection or background process.</p></div>
  </div>;
}
