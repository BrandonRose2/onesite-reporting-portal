import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

export const currency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value ?? 0));

export const percent = (value: number) => new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value || 0);

export function MetricCard({ label, value, detail, icon: Icon, tone = "navy" }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: "navy" | "teal" | "amber" | "rose" }) {
  const tones = {
    navy: "bg-[#17365d] text-white shadow-[#17365d]/20",
    teal: "bg-[#0c7469] text-white shadow-[#0c7469]/20",
    amber: "bg-[#c17d19] text-white shadow-[#c17d19]/20",
    rose: "bg-[#b44851] text-white shadow-[#b44851]/20",
  };
  return <section className={cn("rounded-[1.25rem] p-5 shadow-lg transition-transform duration-200 hover:-translate-y-0.5", tones[tone])}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">{label}</p>
        <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-[1.7rem]">{value}</p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/12"><Icon className="h-5 w-5" /></div>
    </div>
    {detail ? <p className="mt-4 text-xs text-white/72">{detail}</p> : null}
  </section>;
}

export function ChangeBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (!value) return <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Minus className="h-3.5 w-3.5" /> No change</span>;
  const isPositive = value > 0;
  return <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", isPositive ? "text-rose-700" : "text-emerald-700")}>
    {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
    {isPositive ? "+" : ""}{suffix === "$" ? currency(value) : suffix === "%" ? `${(value * 100).toFixed(1)}%` : `${value}${suffix}`}
  </span>;
}

export function Panel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="rounded-[1.25rem] border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(16,37,63,0.05)]">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div>
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0c7469]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#122b4b]">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </section>;
}
