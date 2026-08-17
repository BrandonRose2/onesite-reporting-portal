import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Property Reports Library workflow", () => {
  it("uses property folders with all report-type subfolders and timestamped generated outputs", () => {
    const library = readFileSync(new URL("../client/src/pages/PropertyReportsLibrary.tsx", import.meta.url), "utf8");
    expect(library).toContain("Property Reports Library");
    expect(library).toContain("Show all available report folders");
    expect(library).toContain("canonicalReportKey");
    expect(library).toContain("Filed {filedAt(document.createdAt)}");
    expect(library).toContain('document.documentKind === "property_workbook"');
    expect(library).toContain("Retained raw OneSite source evidence");
  });

  it("provides a printable HTML report and explicit manager office extension fields", () => {
    const reportView = readFileSync(new URL("../client/src/pages/PropertyReportView.tsx", import.meta.url), "utf8");
    expect(reportView).toContain("AptCorp Property Report");
    expect(reportView).toContain("Print / save PDF");
    expect(reportView).toContain("Prepare email");
    expect(reportView).toContain("mailto:");
    expect(reportView).toContain("Office & ext.");
    expect(reportView).toContain("extension not on file");
  });

  it("registers a protected administrator report catalog manager", () => {
    const routes = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const manager = readFileSync(new URL("../client/src/pages/ReportCatalogManager.tsx", import.meta.url), "utf8");
    const router = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
    expect(routes).toContain('path={"/report-catalog"}');
    expect(manager).toContain("Manage Reports");
    expect(manager).toContain("saveCatalogEntry");
    expect(router).toContain("catalogAdmin: adminProcedure");
    expect(router).toContain("saveCatalogEntry: adminProcedure");
  });
});
