import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("historical-only Granite property visibility", () => {
  it("keeps the shared portfolio dashboard limited to active properties", () => {
    const source = readFileSync(new URL("./delinquency.ts", import.meta.url), "utf8");
    expect(source).toContain("eq(properties.isActive, true)");
  });

  it("removes both unrecognized Granite properties from manager-checklist package selection", () => {
    const source = readFileSync(new URL("../client/src/pages/ManagerChecklists.tsx", import.meta.url), "utf8");
    expect(source).not.toContain('"5083727": "5083727_Granite Elmwood Indiana Homes');
    expect(source).not.toContain('"5159418": "5159418_Granite Valencia Villas');
  });
});
