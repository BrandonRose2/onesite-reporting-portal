export type ManagerChecklistItemStatus = "pending" | "confirmed" | "follow_up" | "escalated";

export type ManagerChecklistItem = {
  id: string;
  sectionId: string;
  label: string;
  detail: string;
  status: ManagerChecklistItemStatus;
  notes: string;
  targetDate: string;
};

export type ManagerChecklistState = {
  version: 1;
  items: ManagerChecklistItem[];
};

export const managerChecklistSections = [
  {
    id: "cross_reference",
    title: "Source cross-reference",
    description: "Confirm that this report belongs to the property and review period shown above.",
    items: [
      ["report_scope", "Confirm report scope", "The report property, fiscal period, and selected parameters are correct."],
      ["source_review", "Review the original report", "Open the original Excel file and confirm it is complete and readable."],
    ],
  },
  {
    id: "availability",
    title: "Availability follow-up",
    description: "Validate unit availability and recorded status before operating on any variance.",
    items: [
      ["availability_review", "Validate availability information", "Confirm reported availability entries against the property record."],
      ["availability_follow_up", "Record availability follow-up", "Document any correction, owner, or expected resolution date."],
    ],
  },
  {
    id: "amount_owed",
    title: "Resident balance follow-up — amount owed",
    description: "Review material delinquent balances and the documented collection action for each applicable resident.",
    items: [
      ["owed_review", "Validate amounts owed", "Confirm material delinquent balances and ledger status in the report."],
      ["owed_actions", "Document collection action", "Record contact, arrangement, escalation, or any required next step."],
    ],
  },
  {
    id: "prepaid_credit",
    title: "Resident balance follow-up — prepaid / credit",
    description: "Review prepaid or credit balances and confirm their expected ledger treatment.",
    items: [
      ["credit_review", "Validate prepaid and credit balances", "Confirm credits are expected and allocated appropriately."],
      ["credit_actions", "Record credit follow-up", "Document any correction, owner, or target date needed."],
    ],
  },
  {
    id: "paid_zero",
    title: "Resident balance follow-up — paid / zero balance",
    description: "Validate paid or zero-balance entries that need confirmation from property operations.",
    items: [
      ["paid_review", "Confirm paid or zero balances", "Confirm balances marked paid or zero are accurate."],
      ["exceptions", "Document exceptions", "Record any disputed, unresolved, or escalated item."],
    ],
  },
] as const;

export function createDefaultManagerChecklistState(): ManagerChecklistState {
  return {
    version: 1,
    items: managerChecklistSections.flatMap(section => section.items.map(([id, label, detail]) => ({
      id,
      sectionId: section.id,
      label,
      detail,
      status: "pending" as const,
      notes: "",
      targetDate: "",
    }))),
  };
}

const allowedStatuses = new Set<ManagerChecklistItemStatus>(["pending", "confirmed", "follow_up", "escalated"]);

export function normalizeManagerChecklistState(value: unknown): ManagerChecklistState {
  const defaults = createDefaultManagerChecklistState();
  const source = value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)
    ? (value as { items: unknown[] }).items
    : [];
  const submitted = new Map(source.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map(item => [String(item.id ?? ""), item]));
  return {
    version: 1,
    items: defaults.items.map(item => {
      const saved = submitted.get(item.id);
      const status = typeof saved?.status === "string" && allowedStatuses.has(saved.status as ManagerChecklistItemStatus) ? saved.status as ManagerChecklistItemStatus : item.status;
      return {
        ...item,
        status,
        notes: typeof saved?.notes === "string" ? saved.notes.slice(0, 4000) : "",
        targetDate: typeof saved?.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(saved.targetDate) ? saved.targetDate : "",
      };
    }),
  };
}

export function managerChecklistProgress(state: ManagerChecklistState) {
  const total = state.items.length;
  const completed = state.items.filter(item => item.status !== "pending").length;
  const confirmed = state.items.filter(item => item.status === "confirmed").length;
  return { total, completed, confirmed, percent: total ? Math.round((completed / total) * 100) : 0 };
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
  const statusLabel = (status: ManagerChecklistItemStatus) => ({ pending: "Pending", confirmed: "Confirmed", follow_up: "Follow-up", escalated: "Escalated" })[status];
  const sections = managerChecklistSections.map(section => {
    const items = input.state.items.filter(item => item.sectionId === section.id);
    return `## ${section.title}\n${section.description}\n\n${items.map(item => `- [${item.status === "confirmed" ? "x" : " "}] **${item.label}** — ${statusLabel(item.status)}${item.targetDate ? ` · Target: ${item.targetDate}` : ""}${item.notes ? `\n  - Notes: ${item.notes}` : ""}`).join("\n")}`;
  }).join("\n\n");
  return `# ${input.propertyName} — Manager Delinquency & Availability Checklist\n\n**Report:** ${input.reportName}  \n**Request:** #${input.requestId}  \n**Manager validation:** ${input.status === "submitted" ? "Submitted" : "In progress"}  \n**Progress:** ${progress.completed}/${progress.total} items updated (${progress.percent}%)${input.submittedAt ? `  \n**Submitted:** ${input.submittedAt.toLocaleString()}` : ""}\n\n${sections}\n\n## Manager Summary & Commitments\n${input.managerSummary.trim() || "No summary has been entered yet."}\n\n---\nSaved in OneSite Reporting Hub. Email delivery is not enabled for this checklist.`;
}
