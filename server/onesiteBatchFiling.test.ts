import { describe, expect, it } from "vitest";
import { getOneSite60001FilingPlan, ONESITE_60001 } from "./onesiteBatchFiling";

describe("OneSite Request #60001 browser filing plan", () => {
  it("keeps the provider-exception rows out of the completed filing list", () => {
    expect(ONESITE_60001.completedProperties).toHaveLength(31);
    expect(ONESITE_60001.inProgressProperties).toEqual(["Cumberland Apartments", "Urban Rehab"]);
    expect(ONESITE_60001.erroredProperties).toEqual(["Granite Elmwood Indiana Homes", "Granite Valencia Villas"]);
  });

  it("accepts only missing complete pairs and rejects an incomplete existing pair", () => {
    const plan = getOneSite60001FilingPlan([
      { propertyName: "135th Street Apartments", documentKind: "source_report", originalFilename: "135th.xls" },
      { propertyName: "135th Street Apartments", documentKind: "workbook_html", originalFilename: "135th.html" },
    ]);
    expect(plan.alreadyFiled).toEqual(["135th Street Apartments"]);
    expect(plan.pendingFiling).toContain("Granite Ridge Apartments");
    expect(() => getOneSite60001FilingPlan([{ propertyName: "Anaheim Gardens", documentKind: "source_report", originalFilename: "anaheim.xls" }])).toThrow(/incomplete original\/HTML document pairs/);
  });
});

