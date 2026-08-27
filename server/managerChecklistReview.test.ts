import { describe, expect, it } from "vitest";
import { createDefaultManagerChecklistState, managerChecklistProgress, normalizeManagerChecklistState, renderManagerChecklistMarkdown } from "./managerChecklistReview";

describe("manager checklist review state", () => {
  it("creates a stable sectioned checklist from the approved review categories", () => {
    const state = createDefaultManagerChecklistState();
    expect(state.items).toHaveLength(10);
    expect(state.items.map(item => item.sectionId)).toContain("amount_owed");
    expect(managerChecklistProgress(state)).toEqual({ total: 10, completed: 0, confirmed: 0, percent: 0 });
  });

  it("normalizes untrusted saved data to the approved checklist item set", () => {
    const state = normalizeManagerChecklistState({ items: [{ id: "owed_review", status: "confirmed", notes: "Ledger reviewed", targetDate: "2026-08-31" }, { id: "unknown", status: "escalated" }] });
    expect(state.items).toHaveLength(10);
    expect(state.items.find(item => item.id === "owed_review")).toMatchObject({ status: "confirmed", notes: "Ledger reviewed", targetDate: "2026-08-31" });
    expect(state.items.some(item => item.id === "unknown")).toBe(false);
  });

  it("renders saved review status and notes as Markdown without email-delivery language", () => {
    const state = normalizeManagerChecklistState({ items: [{ id: "owed_review", status: "follow_up", notes: "Contact resident", targetDate: "2026-09-01" }] });
    const markdown = renderManagerChecklistMarkdown({ propertyName: "Boca Ciega Townhomes", reportName: "Delinquent and Prepaid (Excel)", requestId: 2, state, managerSummary: "Regional follow-up requested.", status: "in_progress" });
    expect(markdown).toContain("Resident balance follow-up — amount owed");
    expect(markdown).toContain("Contact resident");
    expect(markdown).toContain("Email delivery is not enabled");
  });
});
