import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Run Scraper workflow", () => {
  const source = readFileSync(new URL("../client/src/pages/Refresh.tsx", import.meta.url), "utf8");

  it("presents the source import path as three clear steps", () => {
    expect(source).toContain("Step 1 · Name the reporting period");
    expect(source).toContain("Step 2 · Choose source reports");
    expect(source).toContain("Step 3 · Create snapshot");
    expect(source).toContain("Create reporting-period snapshot");
  });

  it("communicates batch readiness and secure snapshot progress", () => {
    expect(source).toContain("Ready for snapshot");
    expect(source).toContain("Preparing report ${preparedCount} of ${files.length}");
    expect(source).toContain("Source identifiers, import timestamps, and file traceability");
    expect(source).toContain("Every source XLS is retained in secure file storage");
  });

  it("shows a real post-import completion summary with reporting-history access", () => {
    expect(source).toContain("Import complete");
    expect(source).toContain("Reporting-period snapshot created");
    expect(source).toContain("Archived sources");
    expect(source).toContain('setLocation("/history")');
  });
});
