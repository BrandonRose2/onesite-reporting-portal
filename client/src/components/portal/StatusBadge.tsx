import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  queued: "Queued",
  claimed: "Claimed",
  in_progress: "In progress",
  completed: "Completed",
  completed_with_warnings: "Completed with warnings",
  failed: "Failed",
  ready: "Runner ready",
  unavailable: "Runner unavailable",
  interactive_required: "Interactive step required",
};

const tones: Record<string, string> = {
  queued: "bg-amber-50 text-amber-800 ring-amber-200",
  claimed: "bg-sky-50 text-sky-800 ring-sky-200",
  in_progress: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  completed_with_warnings: "bg-orange-50 text-orange-800 ring-orange-200",
  failed: "bg-rose-50 text-rose-800 ring-rose-200",
  ready: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  unavailable: "bg-slate-100 text-slate-700 ring-slate-200",
  interactive_required: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ring-1", tones[status] ?? tones.unavailable, className)}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{labels[status] ?? status.replaceAll("_", " ")}</span>;
}

