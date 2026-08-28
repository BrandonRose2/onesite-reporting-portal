import { describe, expect, it } from "vitest";
import { resolveCatalogFormats } from "./db";

describe("resolveCatalogFormats", () => {
  it("keeps legacy OneSite catalogs usable when a runner omits formats", () => {
    expect(resolveCatalogFormats("onesite")).toEqual(["excel"]);
  });

  it("does not invent a Yardi export format before a report form is inspected", () => {
    expect(resolveCatalogFormats("yardi")).toEqual([]);
  });

  it("retains explicitly observed provider formats for either source", () => {
    expect(resolveCatalogFormats("yardi", ["pdf", "excel"])).toEqual(["pdf", "excel"]);
  });
});
