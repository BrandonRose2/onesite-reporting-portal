import { describe, expect, it } from "vitest";
import { canArchiveReportHistoryEntry } from "./db";

describe("report-history archive safeguards", () => {
  it("refuses to remove active runner work from history", () => {
    expect(canArchiveReportHistoryEntry("claimed")).toBe(false);
    expect(canArchiveReportHistoryEntry("in_progress")).toBe(false);
  });

  it("allows non-active records to be archived without deleting their source artifacts", () => {
    expect(canArchiveReportHistoryEntry("queued")).toBe(true);
    expect(canArchiveReportHistoryEntry("completed")).toBe(true);
    expect(canArchiveReportHistoryEntry("failed")).toBe(true);
  });
});
