import { FileSpreadsheet, Link2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export function OneSiteBatchUploader() {
  const utils = trpc.useUtils();
  const { data: plan, isLoading, error } = trpc.batchFiling.oneSite60001Plan.useQuery();
  const createCapability = trpc.batchFiling.createOneSite60001EdgeCapability.useMutation();
  const [extensionId, setExtensionId] = useState<string | null>(null);
  const [companionState, setCompanionState] = useState<"unavailable" | "ready" | "paired">("unavailable");

  useEffect(() => {
    const channel = "onesite-60001-edge-companion";
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window || !event.data || event.data.channel !== channel) return;
      if (event.data.type === "READY" && /^[a-p]{32}$/.test(event.data.extensionId)) { setExtensionId(event.data.extensionId); setCompanionState("ready"); }
      if (event.data.type === "PAIRED") setCompanionState("paired");
      if (event.data.type === "FILED") utils.batchFiling.oneSite60001Plan.invalidate();
      if (event.data.type === "TRANSFER_ERROR") setCompanionState("ready");
    };
    window.addEventListener("message", listener);
    window.postMessage({ channel, type: "DISCOVER" }, window.location.origin);
    return () => window.removeEventListener("message", listener);
  }, [utils]);

  const pairCompanion = async () => {
    if (!extensionId) return;
    const pair = await createCapability.mutateAsync({ extensionId });
    window.postMessage({ channel: "onesite-60001-edge-companion", type: "PAIR", capability: pair.capability, portalOrigin: window.location.origin }, window.location.origin);
  };

  if (isLoading) return <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading the protected Request #60001 filing plan…</p></section>;
  if (error || !plan) return <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-sm font-semibold text-rose-900">The Request #60001 filing plan is unavailable.</p><p className="mt-1 text-xs leading-5 text-rose-700">{error?.message ?? "Reload this page before uploading any workbook."}</p></section>;

  return <section className="rounded-2xl border border-[#bfe9db] bg-white p-5 shadow-[0_12px_28px_-22px_rgba(15,35,67,.5)]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0b8775]">Edge-only filing</p><h2 className="mt-1 text-lg font-semibold text-slate-950">File existing OneSite All Units workbooks</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Request #60001 has {plan.pendingFiling.length} completed workbooks still awaiting filing. The Edge companion can transfer only the existing verified results directly into this portal; it cannot create or modify a OneSite report.</p></div><span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><FileSpreadsheet className="h-3.5 w-3.5" />{plan.alreadyFiled.length} pairs retained</span></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><StatusCard label="Ready to file" value={plan.pendingFiling.length} tone="teal" /><StatusCard label="Still in progress" value={plan.inProgress.join(" · ")} tone="amber" /><StatusCard label="Provider errors" value={plan.errored.join(" · ")} tone="rose" /></div>
    <div className="mt-5 rounded-xl border border-[#bfe9db] bg-[#effaf7] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-[#063e36]"><ShieldCheck className="h-4 w-4" />Direct Edge transfer</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#4b6f69]">{companionState === "paired" ? "Paired for this browser session. The agent can retrieve eligible existing results and the companion files them automatically." : companionState === "ready" ? "The Edge companion is installed. Pair it once; you will not select, upload, or handle report files." : "The restricted Edge companion must be installed once before agent-operated direct filing can begin. It has no credential, cookie, report-creation, or broad-download permission."}</p></div><Button type="button" variant="outline" disabled={companionState === "unavailable" || companionState === "paired" || createCapability.isPending} onClick={pairCompanion} className="border-[#0b8775] bg-white text-[#087365] hover:bg-[#e4f7f2]">{createCapability.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}{companionState === "paired" ? "Edge paired" : "Pair Edge companion"}</Button></div></div>
    <p className="mt-5 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">The direct-transfer route accepts only the 21 verified completed OneSite Excel results. It rejects duplicate pairs, all non-Excel data, properties outside the authorized list, and the two in-progress and two errored provider rows. Filing remains blocked after 6 PM Pacific and on weekends.</p>
  </section>;
}

function StatusCard({ label, value, tone }: { label: string; value: string | number; tone: "teal" | "amber" | "rose" }) {
  const tones = { teal: "border-[#bfe9db] bg-[#effaf7] text-[#063e36]", amber: "border-amber-200 bg-amber-50 text-amber-900", rose: "border-rose-200 bg-rose-50 text-rose-900" };
  return <div className={`rounded-xl border p-3 ${tones[tone]}`}><p className="text-[10px] font-bold uppercase tracking-[0.13em] opacity-70">{label}</p><p className="mt-1 text-xs font-semibold leading-5">{value}</p></div>;
}
