import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("OneSite Reporting Hub request workflow", () => {
  it("exposes approved-user catalog and contact access plus administrator-controlled queue actions", () => {
    const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(routers).toContain("onesiteReporting: router");
    expect(routers).toContain("queueCatalogReport: adminProcedure");
    expect(routers).toContain("syncMyReports: adminProcedure");
    expect(routers).toContain("format: z.enum");
    expect(routers).toContain("scheduledFor");
    expect(routers).toContain("reportParameters");
    expect(routers).toContain("internalNotificationUsers");
    expect(routers).toContain("liveEdgeStatus");
    expect(routers).toContain("catalog: portfolioProcedure");
    expect(routers).toContain("propertyContacts: portalProcedure");
    expect(routers).toContain("documents: portalProcedure");
  });

  it("renders a report-title selector and an all-properties queue action", () => {
    const page = readFileSync(new URL("../client/src/pages/OneSiteReportingHub.tsx", import.meta.url), "utf8");
    expect(page).toContain("OneSite Reporting Hub");
    expect(page).toContain("Find a report");
    expect(page).toContain("Start typing to search");
    expect(page).toContain("Type a title such as “rent roll” or “delinquency,”");
    expect(page).toContain("role=\"combobox\"");
    expect(page).toContain("selectReport");
    expect(page).toContain("Generate report for all properties");
    expect(page).toContain("Schedule report for all properties");
    expect(page).toContain("Report-specific parameters");
    expect(page).toContain("Sync My Reports");
    expect(page).toContain("Delinquency + OneSite management");
    expect(page).toContain("Approved OneSite report");
    expect(page).toContain("Live Edge ready");
    expect(page).toContain("Last checked:");
    expect(page).toContain("Last ready:");
    expect(page).toContain("Open signed-in Edge to queue");
    expect(page).toContain("Property contact autofill");
    expect(page).toContain("Company Contacts");
    expect(page).toContain("automatically fills its authorized Company Contacts email");
    expect(page).toContain("const suggestedCatalog = filteredCatalog;");
    expect(page).not.toContain("filteredCatalog.slice(0, 8)");
    expect(page).toContain("matching {suggestedCatalog.length === 1 ? \"report\" : \"reports\"}");
    expect(page).toContain("Completed My Reports documents");
    expect(page).toContain("Open workbook");
    expect(page).toContain("delinquency\")");
  });

  it("registers and navigates the OneSite Reporting Hub at the same sidebar route", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(app).toContain('<Route path={"/onesite-reports"}>');
    expect(layout).toContain('{ icon: FileOutput, label: "OneSite Reporting Hub", path: "/onesite-reports" }');
    expect(layout).toContain('setLocation(item.path)');
    expect(layout).toContain('location.startsWith("/onesite-reports")');
    expect(layout).toContain('aria-current={isActive ? "page" : undefined}');
    expect(layout).toContain('focus-visible:ring-2');
  });
});
