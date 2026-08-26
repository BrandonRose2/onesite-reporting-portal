import { describe, expect, it } from "vitest";
import { buildManagerChecklist } from "./managerChecklist";

describe("manager checklist generation", () => {
  it("builds an escaped property-specific HTML and Markdown briefing without fabricating report findings", () => {
    const checklist = buildManagerChecklist({ requestId: 21, source: "onesite", reportName: "Aging < Summary", reportStatus: "completed_with_warnings", generatedAt: new Date("2026-08-26T12:00:00Z"), property: { name: "North & South", externalId: "N-1", managerName: "Jordan", managerEmail: "jordan@example.com" }, summaryMarkdown: "Review aged balances.", warningSummary: "One document was delayed.", documents: [{ originalFilename: "aging.pdf", storageUrl: "https://files.example/aging.pdf" }] });
    expect(checklist.markdown).toContain("Manager’s Checklist — North & South");
    expect(checklist.html).toContain("Aging &lt; Summary");
    expect(checklist.html).toContain("Jordan");
    expect(checklist.html).toContain("aging.pdf");
    expect(checklist.html).toContain("https://files.example/aging.pdf");
  });
});
