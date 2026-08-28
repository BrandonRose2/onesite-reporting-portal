import { describe, expect, it } from "vitest";
import { createDefaultManagerChecklistState, managerChecklistBlockers, managerChecklistProgress, normalizeManagerChecklistState, renderManagerChecklistMarkdown } from "./managerChecklistReview";

describe("manager checklist review state", () => {
  it("creates a stable sectioned checklist from the approved review categories", () => {
    const state = createDefaultManagerChecklistState();
    expect(state.items).toHaveLength(0);
    expect(managerChecklistProgress(state)).toEqual({ total: 0, completed: 0, confirmed: 0, percent: 0, missing: 0 });
  });

  it("normalizes untrusted saved data to the approved checklist item set", () => {
    const state = normalizeManagerChecklistState({ version: 2, items: [{ id: "resident-1", sectionId: "report_review", label: "Unit 101 · Resident", detail: "Current resident", reportedValue: "$250.00", status: "confirmed", notes: "Ledger reviewed", targetDate: "2026-08-31" }, { id: "resident-1", label: "Duplicate", status: "escalated" }] });
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ id: "resident-1", status: "confirmed", notes: "Ledger reviewed", targetDate: "2026-08-31", reportedValue: "$250.00" });
  });

  it("renders saved review status and notes as Markdown without email-delivery language", () => {
    const state = normalizeManagerChecklistState({ version: 2, items: [{ id: "resident-1", sectionId: "report_review", label: "Unit 101 · Resident", detail: "Current resident", reportedValue: "$250.00", correctedValue: "$200.00", status: "follow_up", notes: "Contact resident", targetDate: "2026-09-01" }] });
    const markdown = renderManagerChecklistMarkdown({ propertyName: "Boca Ciega Townhomes", reportName: "Delinquent and Prepaid (Excel)", requestId: 2, state, managerSummary: "Regional follow-up requested.", status: "in_progress" });
    expect(markdown).toContain("Report line validation");
    expect(markdown).toContain("Contact resident");
    expect(markdown).toContain("Email delivery is not enabled");
  });

  it("identifies the correction, note, and summary fields that block a manager submission", () => {
    const state = normalizeManagerChecklistState({ version: 2, items: [{ id: "resident-1", sectionId: "report_review", label: "Unit 101 · Resident", detail: "Current resident", reportedValue: "$250.00", status: "follow_up", notes: "", targetDate: "" }] });
    expect(managerChecklistBlockers(state, "").map(blocker => blocker.message)).toEqual([
      "Unit 101 · Resident: enter the corrected value.",
      "Unit 101 · Resident: add a note for upper management.",
      "Add a manager summary before submitting for review.",
    ]);
    expect(managerChecklistBlockers(normalizeManagerChecklistState({ version: 2, items: [{ ...state.items[0], correctedValue: "$200.00", notes: "Ledger corrected" }] }), "Review complete")).toEqual([]);
  });

  it("excludes pending zero-balance report lines from default progress, blockers, and Markdown", () => {
    const state = normalizeManagerChecklistState({ version: 2, items: [
      { id: "zero-balance", sectionId: "report_lines", label: "Unit 101 · Zero balance", detail: "Current resident", reportedValue: "$0.00", status: "pending", notes: "", targetDate: "" },
      { id: "balance-due", sectionId: "report_lines", label: "Unit 102 · Balance due", detail: "Current resident", reportedValue: "$250.00", status: "pending", notes: "", targetDate: "" },
    ] });
    expect(managerChecklistProgress(state)).toMatchObject({ total: 1, completed: 0 });
    expect(managerChecklistBlockers(state, "").map(blocker => blocker.itemId)).toEqual(["balance-due", "manager-summary"]);
    expect(renderManagerChecklistMarkdown({ propertyName: "Example", reportName: "Delinquency", requestId: 9, state, managerSummary: "Review in progress", status: "in_progress" })).not.toContain("Zero balance");
  });
});
