export type ManagerChecklistItemStatus = "pending" | "confirmed" | "follow_up" | "escalated";

export type ManagerChecklistItem = {
  id: string;
  sectionId: string;
  label: string;
  detail: string;
  status: ManagerChecklistItemStatus;
  notes: string;
  targetDate: string;
  reportedValue?: string;
  correctedValue?: string;
  sourceSheet?: string;
  sourceRow?: number;
  requiresVerification?: boolean;
};

export type ManagerChecklistState = { version: 2; items: ManagerChecklistItem[] };

const allowedStatuses = new Set<ManagerChecklistItemStatus>(["pending", "confirmed", "follow_up", "escalated"]);
const validDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
const text = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : "";

export function createDefaultManagerChecklistState(): ManagerChecklistState {
  return { version: 2, items: [] };
}

export function normalizeManagerChecklistState(value: unknown): ManagerChecklistState {
  if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 2) return createDefaultManagerChecklistState();
  const source = value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)
    ? (value as { items: unknown[] }).items
    : [];
  const ids = new Set<string>();
  const items: ManagerChecklistItem[] = [];
  for (const raw of source) {
    if (!raw || typeof raw !== "object" || items.length >= 500) continue;
    const item = raw as Record<string, unknown>;
    const id = text(item.id, 80).trim();
    const label = text(item.label, 220).trim();
    if (!id || !label || ids.has(id)) continue;
    ids.add(id);
    const status = typeof item.status === "string" && allowedStatuses.has(item.status as ManagerChecklistItemStatus)
      ? item.status as ManagerChecklistItemStatus
      : "pending";
    items.push({
      id,
      sectionId: text(item.sectionId, 80).trim() || "report_review",
      label,
      detail: text(item.detail, 1000).trim(),
      status,
      notes: text(item.notes, 4000),
      targetDate: validDate(item.targetDate),
      reportedValue: text(item.reportedValue, 120).trim() || undefined,
      correctedValue: text(item.correctedValue, 120).trim() || undefined,
      sourceSheet: text(item.sourceSheet, 100).trim() || undefined,
      sourceRow: typeof item.sourceRow === "number" && Number.isInteger(item.sourceRow) && item.sourceRow > 0 ? item.sourceRow : undefined,
      requiresVerification: item.requiresVerification !== false,
    });
  }
  return { version: 2, items };
}

export type ManagerChecklistBlocker = { itemId: string; message: string };

export function managerChecklistBlockers(state: ManagerChecklistState, managerSummary = ""): ManagerChecklistBlocker[] {
  const blockers: ManagerChecklistBlocker[] = [];
  for (const item of state.items) {
    if (item.requiresVerification && item.status === "pending") blockers.push({ itemId: item.id, message: `${item.label}: select Verified or Needs correction.` });
    if (item.status === "follow_up" && !item.correctedValue?.trim()) blockers.push({ itemId: item.id, message: `${item.label}: enter the corrected value.` });
    if ((item.status === "follow_up" || item.status === "escalated") && !item.notes.trim()) blockers.push({ itemId: item.id, message: `${item.label}: add a note for upper management.` });
  }
  if (state.items.length && !managerSummary.trim()) blockers.push({ itemId: "manager-summary", message: "Add a manager summary before submitting for review." });
  return blockers;
}

export function managerChecklistProgress(state: ManagerChecklistState) {
  const total = state.items.filter(item => item.requiresVerification).length;
  const completed = state.items.filter(item => item.requiresVerification && item.status !== "pending").length;
  const confirmed = state.items.filter(item => item.status === "confirmed").length;
  const blockers = managerChecklistBlockers(state);
  return { total, completed, confirmed, percent: total ? Math.round((completed / total) * 100) : 0, missing: blockers.length };
}

export function renderManagerChecklistMarkdown(input: {
  propertyName: string;
  reportName: string;
  requestId: number;
  state: ManagerChecklistState;
  managerSummary: string;
  status: "in_progress" | "submitted";
  submittedAt?: Date | null;
}) {
  const progress = managerChecklistProgress(input.state);
  const statusLabel = (status: ManagerChecklistItemStatus) => ({ pending: "Pending", confirmed: "Verified", follow_up: "Needs correction", escalated: "Escalated" })[status];
  const lines = input.state.items.length
    ? input.state.items.map(item => `- [${item.status === "confirmed" ? "x" : " "}] **${item.label}**${item.reportedValue ? ` — Reported: ${item.reportedValue}` : ""}${item.correctedValue ? ` · Corrected: ${item.correctedValue}` : ""} · ${statusLabel(item.status)}${item.notes ? `\n  - Management note: ${item.notes}` : ""}${item.targetDate ? `\n  - Target date: ${item.targetDate}` : ""}`).join("\n")
    : "- [ ] Open the report data and create review items for the entries requiring manager validation.";
  return `# ${input.propertyName} — Report Review\n\n**Report:** ${input.reportName}  \n**Request:** #${input.requestId}  \n**Review status:** ${input.status === "submitted" ? "Submitted for approval" : "In progress"}  \n**Progress:** ${progress.completed}/${progress.total} verified (${progress.percent}%) · **Needs attention:** ${progress.missing}${input.submittedAt ? `  \n**Submitted:** ${input.submittedAt.toLocaleString()}` : ""}\n\n## Report line validation\n${lines}\n\n## Manager Summary & Commitments\n${input.managerSummary.trim() || "No summary has been entered yet."}\n\n---\nSaved in OneSite Reporting Hub. Email delivery is not enabled for this review.`;
}
