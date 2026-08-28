import { ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function YardiSessionPanel() {
  const { data } = trpc.operations.recoveryStatus.useQuery(undefined, { refetchInterval: 30_000 });
  const yardi = data?.runners.yardi;
  const ready = yardi?.status === "ready";
  const detail = typeof yardi?.detail === "string" && yardi.detail.trim()
    ? yardi.detail
    : "No authorized Yardi Edge session has been confirmed yet.";

  return <section className={`mb-6 rounded-2xl border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-violet-200 bg-violet-50"}`} aria-live="polite">
    <div className="flex gap-3">
      <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${ready ? "text-emerald-700" : "text-violet-700"}`} />
      <div>
        <p className="text-sm font-semibold text-slate-950">Yardi Edge session {ready ? "ready" : "required"}</p>
        <p className="mt-1 text-sm leading-6 text-slate-700">{detail}</p>
        {!ready ? <><p className="mt-3 text-xs leading-5 text-slate-600">Sign in normally through your authorized Microsoft Edge Yardi session. This portal never stores Yardi passwords, browser cookies, MFA codes, or session tokens.</p><a href="https://menowitz35033.yardione.com/" target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-800">Open Yardi in Microsoft Edge</a></> : null}
      </div>
    </div>
  </section>;
}
