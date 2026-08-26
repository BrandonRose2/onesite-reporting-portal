import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="mb-7 flex flex-col gap-4 border-b border-slate-200/90 pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="text-[11px] font-semibold tracking-[0.02em] text-slate-500">Property Reports <span className="mx-1.5 text-slate-300">/</span> {eyebrow}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-3xl">{title}</h1><Badge className="border-0 bg-[#dff6ef] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#087365] hover:bg-[#dff6ef]">Live internal portal</Badge></div>
      <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </header>;
}
