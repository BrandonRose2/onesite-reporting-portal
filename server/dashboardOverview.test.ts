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

  it("organizes the sidebar around the essential reporting journey", () => {
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(layout).toContain('label: "Report workspace"');
    expect(layout).toContain('label: "Portfolio"');
    expect(layout).toContain('label: "Administration"');
    expect(layout).toContain('label: "Property Reports Library"');
    expect(layout).toContain('label: "Run a report"');
    expect(layout).not.toContain('label: "Compare Periods"');
    expect(layout).not.toContain('label: "Import Data"');
    expect(layout).toContain("ApartmentCorp");
    expect(layout).toContain("Property Reports");
  });

  it("layers a reduced-motion-safe AptCorp atmosphere behind reporting content", () => {
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(layout).toContain("<PortalAtmosphere />");
    expect(layout).toContain("portal-live-dot");
    expect(styles).toContain(".portal-atmosphere");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("uses reporting-focused hero and status motion rather than generic marketing content", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/Dashboard.tsx", import.meta.url), "utf8");
    expect(dashboard).toContain("portal-hero");
    expect(dashboard).toContain("WORKBOOKS FILED");
    expect(dashboard).toContain("portal-report-card");
  });

  it("keeps text reveal and sticky navigation accessible for reduced-motion users", () => {
    const dashboard = readFileSync(new URL("../client/src/pages/Dashboard.tsx", import.meta.url), "utf8");
    const scramble = readFileSync(new URL("../client/src/components/ScrambleText.tsx", import.meta.url), "utf8");
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(dashboard).toContain("<ScrambleText");
    expect(scramble).toContain("IntersectionObserver");
    expect(scramble).toContain("prefers-reduced-motion: reduce");
    expect(layout).toContain("backdrop-blur-xl");
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
