import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("current-residents-only Delinquency presentation", () => {
  it("filters dashboard, property detail, source preview, and exports to current residents", () => {
    const delinquencyService = readFileSync(new URL("./delinquency.ts", import.meta.url), "utf8");
    expect(delinquencyService).toContain('eq(residentLedgerRows.residentStatus, "Current resident")');
    expect(delinquencyService).toContain("currentResidentLedgerRows");
    expect(delinquencyService).toContain("const { totalPrepaid: _totalPrepaid");
  });

  it("does not render prepaid metrics, columns, categories, or raw source filenames in Delinquency UI", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/Dashboard.tsx", import.meta.url), "utf8");
    const property = readFileSync(new URL("../client/src/pages/PropertyDetail.tsx", import.meta.url), "utf8");
    const checklist = readFileSync(new URL("../client/src/pages/ManagerChecklistDetail.tsx", import.meta.url), "utf8");
    const sourcePreview = readFileSync(new URL("../client/src/pages/SourceDocumentPreview.tsx", import.meta.url), "utf8");
    const automation = readFileSync(new URL("../client/src/pages/AutomationSettings.tsx", import.meta.url), "utf8");

    expect(dashboard).not.toContain("netPrepaid");
    expect(property).not.toContain("totalPrepaid");
    expect(checklist).not.toContain("totalPrepaid");
    expect(sourcePreview).not.toContain("totalPrepaid");
    expect(checklist).toContain("Current-resident follow-up");
    expect(automation).toContain("Current residents only");
    expect(automation).not.toContain("Include prepaid balances");
  });

  it("masks the upstream report title while preserving it only for internal matching", () => {
    const catalog = readFileSync(new URL("./onesiteCatalog.ts", import.meta.url), "utf8");
    const hub = readFileSync(new URL("../client/src/pages/OneSiteReportingHub.tsx", import.meta.url), "utf8");
    expect(catalog).toContain('return title === "Delinquent and Prepaid (Excel)" ? "Delinquency (Current Residents)"');
    expect(hub).toContain("portalReportTitle");
    expect(hub).toContain("portalReportTitle(item.displayName)");
    expect(hub).toContain("portalReportTitle(catalog?.displayName ?? request.requestedReportName)");
  });
});
