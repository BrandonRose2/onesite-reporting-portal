import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { isLiveEdgeReady, LiveEdgeConnectionNotice, requestStageHelper, requestStageLabel, type LiveEdgeStatus } from "../client/src/pages/OneSiteReportingHub";

const checkedAt = new Date("2026-08-14T00:50:38.000Z");
const lastReadyAt = new Date("2026-08-14T00:45:00.000Z");

describe("OneSite Reporting Hub live Edge connection UI", () => {
  it("renders a non-ready connection notice with both timestamps and blocks queue actions", () => {
    const status: LiveEdgeStatus = { status: "interactive_required", checkedAt, lastReadyAt, detail: "Sign in required." };
    const html = renderToStaticMarkup(createElement(LiveEdgeConnectionNotice, { status, isLoading: false }));
    expect(html).toContain("Before queueing a report:");
    expect(html).toContain("Last checked:");
    expect(html).toContain("Last ready:");
    expect(html).toContain("Sign in required.");
    expect(isLiveEdgeReady(status)).toBe(false);
  });

  it("renders a ready connection notice with both timestamps and allows queue actions", () => {
    const status: LiveEdgeStatus = { status: "ready", checkedAt, lastReadyAt, detail: "Reports | RealPage" };
    const html = renderToStaticMarkup(createElement(LiveEdgeConnectionNotice, { status, isLoading: false }));
    expect(html).toContain("Live Microsoft Edge is ready.");
    expect(html).toContain("Last checked:");
    expect(html).toContain("Last ready:");
    expect(isLiveEdgeReady(status)).toBe(true);
  });

  it("distinguishes a waiting Mac handoff from OneSite generation", () => {
    expect(requestStageLabel({ status: "queued" })).toBe("Waiting for Mac runner");
    expect(requestStageHelper({ status: "queued" })).toContain("checks for new requests automatically");
    const submitted = { status: "running", sourceRunReference: "Submitted in live Microsoft Edge for all selected properties; awaiting completed files." };
    expect(requestStageLabel(submitted)).toBe("RealPage generating");
    expect(requestStageHelper(submitted)).toContain("OneSite accepted the request");
  });
});
