import { readFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { reportingOverviewQuickActions } from "../client/src/lib/reportingOverview";
import { createOverviewNavigationHandlers, ReportingOverviewQuickActions } from "../client/src/components/ReportingOverviewQuickActions";

describe("overall reporting homepage", () => {
  it("presents How to Use guidance and quick-look summaries of completed reports", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/Dashboard.tsx", import.meta.url), "utf8");
    expect(dashboard).toContain("AptCorp Property Reports");
    expect(dashboard).toContain("How to use");
    expect(dashboard).toContain("Previously pulled reports");
    expect(dashboard).toContain("quickLookReports");
    expect(dashboard).toContain("ReportingOverviewQuickActions");
    expect(dashboard).not.toContain("Delinquency reporting module");
  });

  it("keeps the root sidebar entry concise", () => {
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(layout).toContain('{ icon: LayoutDashboard, label: "Home", path: "/" }');
    expect(layout).not.toContain('label: "Reporting Overview"');
  });

  it("maps each overview quick action to its intended portal route", () => {
    expect(reportingOverviewQuickActions.requestReport).toMatchObject({ title: "Request a report", path: "/onesite-reports" });
    expect(reportingOverviewQuickActions.reviewProperties).toMatchObject({ title: "Review property reporting", path: "/properties" });
    expect(reportingOverviewQuickActions.managerFollowUp).toMatchObject({ title: "Manager follow-up", path: "/manager-checklists" });
  });

  it("renders the branded How to Use quick actions", () => {
    const html = renderToStaticMarkup(createElement(ReportingOverviewQuickActions, { onNavigate: () => undefined }));
    expect(html).toContain("How to use AptCorp Property Reports");
    expect(html).toContain("Request a report");
    expect(html).toContain("Review property reporting");
    expect(html).toContain("Manager follow-up");
  });

  it("wires each rendered overview action to its intended navigation handler", () => {
    const paths: string[] = [];
    const handlers = createOverviewNavigationHandlers(path => paths.push(path));
    handlers.requestReport();
    handlers.reviewProperties();
    handlers.managerFollowUp();
    expect(paths).toEqual(["/onesite-reports", "/properties", "/manager-checklists"]);
  });
});
