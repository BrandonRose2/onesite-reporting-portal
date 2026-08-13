import { describe, expect, it } from "vitest";
import { buildOneSiteCatalogSeeds } from "./onesiteCatalog";

describe("OneSite Reports catalog normalization", () => {
  it("preserves verified report slugs and derives safe default formats", () => {
    const entries = buildOneSiteCatalogSeeds(["Availability", "Delinquent and Prepaid (Excel)", "All Residents (Excel)", "Availability"]);
    expect(entries).toHaveLength(3);
    expect(entries.find(entry => entry.exactReportName === "Availability")).toMatchObject({ slug: "availability-pdf", isVerified: true, defaultFormat: "pdf" });
    expect(entries.find(entry => entry.exactReportName === "Delinquent and Prepaid (Excel)")).toMatchObject({ slug: "delinquent-and-prepaid-excel", isVerified: true, defaultFormat: "excel" });
    expect(entries.find(entry => entry.exactReportName === "All Residents (Excel)")?.defaultFormat).toBe("excel");
  });

  it("makes duplicate exact titles distinct while preserving their runner-visible report title", () => {
    const entries = buildOneSiteCatalogSeeds([
      { title: "Certification Activity", reportArea: "Affordable", reportLevel: "Property", product: "OneSite" },
      { title: "Certification Activity", reportArea: "Residents", reportLevel: "Property", product: "OneSite" },
    ]);
    expect(entries).toHaveLength(2);
    expect(entries.map(entry => entry.exactReportName)).toEqual(["Certification Activity", "Certification Activity"]);
    expect(entries.map(entry => entry.displayName)).not.toContain("Certification Activity");
    expect(new Set(entries.map(entry => entry.slug)).size).toBe(2);
  });
});
