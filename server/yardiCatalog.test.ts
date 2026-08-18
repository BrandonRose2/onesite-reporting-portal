import { describe, expect, it } from "vitest";
import { yardiCategoryOrder, yardiDesignatedProperties, yardiEmptyCategories, yardiReportCatalog } from "../client/src/data/yardiReportCatalog";

describe("Yardi report catalog", () => {
  it("preserves the observed Yardi category coverage and key report types", () => {
    expect(yardiCategoryOrder).toEqual(["Affordable", "50059", "Tax Credit", "Waiting List", "Financial Reports", "RentCafe", "Custom Reports", "Custom Correspondence", "System"]);
    expect(yardiEmptyCategories).toEqual(["Financial Reports", "Custom Reports", "Custom Correspondence"]);
    expect(yardiReportCatalog.some((report) => report.title === "Tenant Delinquency" && report.category === "Affordable")).toBe(true);
    expect(yardiReportCatalog.some((report) => report.title === "RentCafe" && report.category === "RentCafe")).toBe(false);
    expect(yardiReportCatalog.some((report) => report.title === "Attachments Review" && report.category === "System")).toBe(true);
  });

  it("does not expose duplicate Yardi report identities", () => {
    const identities = yardiReportCatalog.map((report) => `${report.category}::${report.group ?? ""}::${report.title}`);
    expect(new Set(identities).size).toBe(identities.length);
  });

  it("keeps the verified Yardi property scope separate and complete", () => {
    expect(yardiDesignatedProperties).toHaveLength(8);
    expect(yardiDesignatedProperties).toContain("La Promesa");
    expect(yardiDesignatedProperties).toContain("Thibodaux - Colonial Estates Apts");
  });
});
