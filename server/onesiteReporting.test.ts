import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { formatOfficePhone, isLiveEdgeReady, LiveEdgeConnectionNotice, LiveEdgeReadiness } from "../client/src/pages/OneSiteReportingHub";

describe("OneSite Reporting Hub request workflow", () => {
  it("exposes approved-user catalog and contact access plus administrator-controlled queue actions", () => {
    const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(routers).toContain("onesiteReporting: router");
    expect(routers).toContain("queueCatalogReport: adminProcedure");
    expect(routers).toContain("queueCatalogPropertyReport: adminProcedure");
    expect(routers).toContain("syncMyReports: adminProcedure");
    expect(routers).toContain("format: z.enum");
    expect(routers).toContain("scheduledFor");
    expect(routers).toContain("reportParameters");
    expect(routers).toContain("internalNotificationUsers");
    expect(routers).toContain("liveEdgeStatus");
    expect(routers).toContain("catalog: portfolioProcedure");
    expect(routers).toContain("propertyContacts: portalProcedure");
    expect(routers).toContain("documents: portalProcedure");
    expect(routers).toContain("documentUrl: portalProcedure");
    expect(readFileSync(new URL("./onesiteReporting.ts", import.meta.url), "utf8")).toContain("CONTACT_AUTOFILL_EXCLUDED_EXTERNAL_IDS");
    expect(readFileSync(new URL("./onesiteReporting.ts", import.meta.url), "utf8")).toContain('notInArray(properties.externalId, CONTACT_AUTOFILL_EXCLUDED_EXTERNAL_IDS)');
  });

  it("renders a report-title selector and an all-properties queue action", () => {
    const page = readFileSync(new URL("../client/src/pages/OneSiteReportingHub.tsx", import.meta.url), "utf8");
    expect(page).toContain("Pull Reports – OneSite");
    expect(page).toContain("Find a report");
    expect(page).toContain("Start typing to search");
    expect(page).toContain("Type a title such as “rent roll” or “delinquency,”");
    expect(page).toContain("role=\"combobox\"");
    expect(page).toContain("selectReport");
    expect(page).toContain('`Generate report for ${propertyScope === "specific" ? "selected property" : "all properties"}`');
    expect(page).toContain("Generate for all mapped properties");
    expect(page).toContain("Specific property");
    expect(page).toContain("queueCatalogPropertyReport.useMutation");
    expect(page).toContain('propertyScope === "specific"');
    expect(page).toContain("Step 1 · Choose Report");
    expect(page).toContain("Step 2 · Set Parameters");
    expect(page).toContain("Step 3 · Choose Property");
    expect(page).toContain("Step 4 · Generate");
    expect(page.indexOf("Step 1 · Choose Report")).toBeLessThan(page.indexOf("Step 2 · Set Parameters"));
    expect(page.indexOf("Step 2 · Set Parameters")).toBeLessThan(page.indexOf("Step 3 · Choose Property"));
    expect(page.indexOf("Step 3 · Choose Property")).toBeLessThan(page.indexOf("Step 4 · Generate"));
    expect(page).toContain("All mapped OneSite properties will be included.");
    expect(page).toContain("This queues the selected report for the one chosen property.");
    expect(page).toContain('`Schedule report for ${propertyScope === "specific" ? "selected property" : "all properties"}`');
    expect(page).toContain("Report-specific parameters");
    expect(page).toContain("Find manually generated reports");
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
    expect(page).toContain("Showing all {suggestedCatalog.length} matching");
    expect(page).toContain("overscroll-contain");
    expect(page).toContain('document.addEventListener("pointerdown", closeOnOutsideInteraction)');
    expect(page).toContain('catalogSelectorRef.current?.contains(event.target as Node)');
    expect(page).toContain("All AptCorp property workbooks");
    expect(page).toContain("AptCorp workbook");
    expect(page).toContain("View retained raw OneSite source evidence");
    expect(page).toContain("Run a report, then open its workbooks here");
    expect(page).toContain("Ready to open");
    expect(page).toContain("Open workbooks");
    expect(page).toContain("showRequestResults");
    expect(page).toContain("Open workbook");
    expect(page).toContain("documentUrl.useMutation");
    expect(page).toContain("openWorkbook(document.id)");
    expect(page).toContain('window.open("", "_blank")');
    expect(page).toContain("target.opener = null");
    expect(page).not.toContain("href={document.storageUrl}");
    expect(page).toContain("portalReportTitle");
  });

  it("resolves filed workbook URLs through the authenticated storage route", () => {
    const service = readFileSync(new URL("./onesiteReporting.ts", import.meta.url), "utf8");
    expect(service).toContain("getOneSiteReportDocumentUrl");
    expect(service).toContain("storageGet(document.storageKey)");
  });

  it("registers the OneSite and Yardi routes while keeping the primary sidebar focused on running a report", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(app).toContain('<Route path={"/onesite-reports"}>');
    expect(app).toContain('<Route path={"/yardi-reports"}>');
    expect(layout).toContain('{ icon: FileOutput, label: "Run a report", path: "/onesite-reports" }');
    expect(layout).not.toContain('label: "Pull Reports – Yardi"');
    expect(layout).toContain('setLocation(item.path)');
    expect(layout).toContain('location.startsWith("/onesite-reports")');
    expect(layout).toContain('aria-current={isActive ? "page" : undefined}');
    expect(layout).toContain('focus-visible:ring-2');
  });

  it("renders ready state timestamps and preserves enabled readiness semantics", () => {
    const readyStatus = { status: "ready" as const, checkedAt: new Date("2026-08-16T17:00:00Z"), lastReadyAt: new Date("2026-08-16T16:59:00Z"), detail: null };
    expect(isLiveEdgeReady(readyStatus)).toBe(true);
    expect(renderToStaticMarkup(createElement(LiveEdgeReadiness, { status: readyStatus, isLoading: false }))).toContain("Live Edge ready");
    const notice = renderToStaticMarkup(createElement(LiveEdgeConnectionNotice, { status: readyStatus, isLoading: false }));
    expect(notice).toContain("Live Microsoft Edge is ready.");
    expect(notice).toContain("Last checked:");
    expect(notice).toContain("Last ready:");
  });

  it("renders unavailable reconnect guidance and preserves disabled readiness semantics", () => {
    const unavailableStatus = { status: "unavailable" as const, checkedAt: new Date("2026-08-16T17:00:00Z"), lastReadyAt: null, detail: "Reports Hub is not open" };
    expect(isLiveEdgeReady(unavailableStatus)).toBe(false);
    expect(renderToStaticMarkup(createElement(LiveEdgeReadiness, { status: unavailableStatus, isLoading: false }))).toContain("Open signed-in Edge");
    const notice = renderToStaticMarkup(createElement(LiveEdgeConnectionNotice, { status: unavailableStatus, isLoading: false }));
    expect(notice).toContain("Before queueing a report:");
    expect(notice).toContain("Open Microsoft Edge on your Mac");
    expect(notice).toContain("Last ready: not yet recorded.");
  });

  it("formats office contact numbers and labels extensions without conflating the two", () => {
    expect(formatOfficePhone("9728782040")).toBe("(972) 878-2040");
    expect(formatOfficePhone("+1 972 878 2040")).toBe("+1 (972) 878-2040");
    expect(formatOfficePhone("Not available")).toBe("Not available");
    const page = readFileSync(new URL("../client/src/pages/OneSiteReportingHub.tsx", import.meta.url), "utf8");
    expect(page).toContain('label="Office & ext."');
    expect(page).toContain('`ext. ${contact.extension}`');
  });
});
