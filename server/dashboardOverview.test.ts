import { readFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { reportingOverviewQuickActions } from "../client/src/lib/reportingOverview";
import { createOverviewNavigationHandlers, ReportingOverviewQuickActions } from "../client/src/components/ReportingOverviewQuickActions";

describe("overall reporting homepage", () => {
  it("presents reporting operations with clear report, property, and manager entry points", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/Dashboard.tsx", import.meta.url), "utf8");
    expect(dashboard).toContain("Reporting Operations");
    expect(dashboard).toContain("ReportingOverviewQuickActions");
    expect(dashboard).toContain("Delinquency reporting module");
    expect(dashboard).toContain("Apartment Corp Portfolio — Reporting Operations");
  });

  it("keeps the root sidebar entry framed as an overall reporting overview", () => {
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(layout).toContain('{ icon: LayoutDashboard, label: "Reporting Overview", path: "/" }');
  });

  it("maps each overview quick action to its intended portal route", () => {
    expect(reportingOverviewQuickActions.requestReport).toMatchObject({ title: "Request a report", path: "/onesite-reports" });
    expect(reportingOverviewQuickActions.reviewProperties).toMatchObject({ title: "Review property reporting", path: "/properties" });
    expect(reportingOverviewQuickActions.managerFollowUp).toMatchObject({ title: "Manager follow-up", path: "/manager-checklists" });
  });

  it("renders the branded reporting overview quick actions", () => {
    const html = renderToStaticMarkup(createElement(ReportingOverviewQuickActions, { onNavigate: () => undefined }));
    expect(html).toContain("Reporting operations quick actions");
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
