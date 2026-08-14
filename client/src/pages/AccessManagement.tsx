import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, UserCheck, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

export default function AccessManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const rulesQuery = trpc.access.rules.useQuery(undefined, { enabled: user?.role === "admin" });
  const propertiesQuery = trpc.access.properties.useQuery(undefined, { enabled: user?.role === "admin" });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"boss" | "manager">("boss");
  const [propertyIds, setPropertyIds] = useState<number[]>([]);
  const saveRule = trpc.access.saveRule.useMutation({
    onSuccess: async () => {
      setEmail("");
      setRole("boss");
      setPropertyIds([]);
      await utils.access.rules.invalidate();
    },
  });
  const setActive = trpc.access.setActive.useMutation({ onSuccess: () => utils.access.rules.invalidate() });

  const selectedNames = useMemo(
    () => (propertiesQuery.data ?? []).filter(property => propertyIds.includes(property.id)).map(property => property.name),
    [propertiesQuery.data, propertyIds]
  );

  if (user?.role !== "admin") {
    return <div className="mx-auto max-w-2xl p-6"><AccessNotice /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <section className="rounded-[1.5rem] border border-[#c8e1db] bg-[linear-gradient(135deg,#f4fbf9_0%,#ffffff_62%)] p-6 shadow-[0_14px_34px_rgba(12,116,105,.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#0c7469]"><ShieldCheck className="h-4 w-4" /> Portal access</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#122b4b]">Approve staff access</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Bosses can view the full portfolio. Managers can be assigned to selected properties. Neither role receives your RealPage credentials or access to your live Microsoft Edge session.</p>
          </div>
          <Badge className="w-fit bg-[#0c7469] px-3 py-1.5 text-white hover:bg-[#0c7469]">Administrator only</Badge>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-[#0c7469]" /><h2 className="font-semibold text-[#122b4b]">Approve an account</h2></div>
          <div className="mt-5 space-y-4">
            <div className="space-y-2"><Label htmlFor="access-email">Manus account email</Label><Input id="access-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@company.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant={role === "boss" ? "default" : "outline"} className={role === "boss" ? "metallic-hunter" : ""} onClick={() => { setRole("boss"); setPropertyIds([]); }}>Boss · full portfolio</Button>
              <Button type="button" variant={role === "manager" ? "default" : "outline"} className={role === "manager" ? "metallic-hunter" : ""} onClick={() => setRole("manager")}>Manager · assigned properties</Button>
            </div>
            {role === "manager" ? <div className="rounded-xl border border-[#c8e1db] bg-[#f6fbfa] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[#0c7469]">Assigned properties</p><div className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2">{(propertiesQuery.data ?? []).map(property => <label key={property.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-xs text-slate-700 shadow-sm"><input type="checkbox" checked={propertyIds.includes(property.id)} onChange={event => setPropertyIds(current => event.target.checked ? [...current, property.id] : current.filter(id => id !== property.id))} /><span className="truncate">{property.name}</span></label>)}</div>{selectedNames.length ? <p className="mt-3 text-xs text-slate-500">{selectedNames.length} property assignment{selectedNames.length === 1 ? "" : "s"} selected.</p> : null}</div> : null}
            {saveRule.error ? <p className="text-sm text-red-700">{saveRule.error.message}</p> : null}
            <Button className="metallic-hunter w-full" disabled={!email.trim() || saveRule.isPending || (role === "manager" && propertyIds.length === 0)} onClick={() => saveRule.mutate({ email, role, propertyIds })}>{saveRule.isPending ? "Saving access…" : "Approve portal access"}</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-[#0c7469]" /><h2 className="font-semibold text-[#122b4b]">Approved accounts</h2></div>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3 pr-4">Account</th><th className="pb-3 pr-4">Role</th><th className="pb-3 pr-4">Scope</th><th className="pb-3">Status</th></tr></thead><tbody>{(rulesQuery.data ?? []).map(rule => { const assigned = rule.propertyIdsJson ? JSON.parse(rule.propertyIdsJson) as number[] : []; return <tr key={rule.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-medium text-[#122b4b]">{rule.email}</td><td className="py-3 pr-4 capitalize">{rule.role}</td><td className="py-3 pr-4 text-slate-600">{rule.role === "boss" ? "Full portfolio" : `${assigned.length} assigned`}</td><td className="py-3"><Button size="sm" variant={rule.isActive ? "outline" : "default"} className={rule.isActive ? "" : "metallic-hunter"} disabled={setActive.isPending} onClick={() => setActive.mutate({ id: rule.id, isActive: !rule.isActive })}>{rule.isActive ? "Revoke" : "Restore"}</Button></td></tr>; })}</tbody></table>{!rulesQuery.isLoading && !(rulesQuery.data ?? []).length ? <p className="py-10 text-center text-sm text-slate-500">No staff accounts have been approved yet.</p> : null}</div>
        </div>
      </section>
    </div>
  );
}

function AccessNotice() {
  return <div className="rounded-2xl border border-[#eed79d] bg-[#fffaf0] p-6 text-[#745116]"><ShieldCheck className="h-7 w-7" /><h1 className="mt-3 text-xl font-bold">Administrator access required</h1><p className="mt-2 text-sm leading-6">Only a portal administrator can approve bosses and managers or change their property assignments.</p></div>;
}
