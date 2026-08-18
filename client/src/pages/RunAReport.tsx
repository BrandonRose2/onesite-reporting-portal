import { ArrowRight, Building2, FileSpreadsheet, ShieldCheck, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

const systems = [
  {
    title: "OneSite / RealPage",
    description: "Run reports for the 33 active OneSite properties through the live Microsoft Edge runner.",
    detail: "Use this for the established OneSite report catalog and Property Reports Library filing path.",
    path: "/onesite-reports",
    icon: Building2,
    accent: "from-[#0f766e] to-[#075e55]",
    iconBg: "bg-white/15",
    status: "33 properties · Live Edge runner",
  },
  {
    title: "Yardi",
    description: "Run reports for the eight Yardi-designated properties through the separate Yardi workflow.",
    detail: "Choose from the captured Yardi report catalog. Execution readiness is shown per workflow.",
    path: "/yardi-reports",
    icon: FileSpreadsheet,
    accent: "from-[#384b85] to-[#243362]",
    iconBg: "bg-white/15",
    status: "⭐ 8 properties · Separate Yardi session",
  },
] as const;

export default function RunAReport() {
  const [, setLocation] = useLocation();

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="overflow-hidden rounded-[1.75rem] border border-[#d9e8e6] bg-white shadow-[0_22px_70px_rgba(16,37,63,0.08)]">
        <div className="relative px-6 py-8 sm:px-9 sm:py-10">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#d8efea] blur-3xl" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <p className="portal-section-label">Step 1 · Choose your reporting system</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#122b4b] sm:text-4xl">Where do you need to pull the report from?</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Start by choosing the source system. This keeps the report catalog, property scope, browser session, and filing workflow clearly separated.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {systems.map(system => {
          const Icon = system.icon;
          return (
            <button
              key={system.title}
              type="button"
              onClick={() => setLocation(system.path)}
              className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 text-left shadow-[0_18px_45px_rgba(16,37,63,0.08)] transition duration-200 hover:-translate-y-1 hover:border-[#9bcfc5] hover:shadow-[0_24px_56px_rgba(16,37,63,0.16)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0c7469]/25 sm:p-8"
            >
              <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${system.accent}`} aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${system.accent} text-white shadow-lg`}>
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">Report system</span>
              </div>
              <h2 className="mt-7 text-2xl font-semibold tracking-[-0.035em] text-[#122b4b]">{system.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{system.description}</p>
              <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">{system.detail}</p>
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <span className="text-xs font-semibold text-[#0c7469]">{system.status}</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#122b4b]">Open {system.title}<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" /></span>
              </div>
            </button>
          );
        })}
      </div>

      <section className="grid gap-4 rounded-[1.5rem] border border-[#d9e8e6] bg-[#f1faf8] p-5 sm:grid-cols-[auto_1fr] sm:items-start sm:p-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#0c7469] shadow-sm"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
        <div>
          <h2 className="font-semibold text-[#122b4b]">Why the choice comes first</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">OneSite and Yardi use different property groups, report catalogs, browser flows, and export behaviors. The portal keeps them separate so the correct system is always clear before a report is requested.</p>
        </div>
      </section>
    </div>
  );
}
