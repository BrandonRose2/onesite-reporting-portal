import { describe, expect, it } from "vitest";
import { findCrossSourcePropertyNameConflict } from "./db";

describe("provider property portfolio isolation", () => {
  it("rejects a normalized property-name collision across OneSite and Yardi", () => {
    const conflict = findCrossSourcePropertyNameConflict("yardi", "Boca Ciega Townhomes", [{ id: 12, source: "onesite", name: "Boca Ciega Townhome Apartments" }]);
    expect(conflict).toMatchObject({ id: 12, source: "onesite" });
  });

  it("does not treat different provider properties or an in-place edit as a collision", () => {
    expect(findCrossSourcePropertyNameConflict("yardi", "Yardi Court", [{ id: 12, source: "onesite", name: "Boca Ciega Townhomes" }])).toBeNull();
    expect(findCrossSourcePropertyNameConflict("yardi", "Yardi Court", [{ id: 13, source: "yardi", name: "Yardi Court" }], 13)).toBeNull();
  });
});
