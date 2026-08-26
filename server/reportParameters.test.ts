import { describe, expect, it } from "vitest";
import { getCatalogParameterDefinitions, validateCatalogParameterValues } from "./reportParameters";

const definitions = getCatalogParameterDefinitions({
  parameterDefinitions: [
    { key: "unitStatus", label: "Unit status", type: "select", required: true, options: [{ label: "Occupied", value: "occupied" }, { label: "Vacant", value: "vacant" }] },
    { key: "includeUnavailable", label: "Include unavailable units", type: "boolean", defaultValue: false },
  ],
});

describe("catalog report parameters", () => {
  it("accepts approved settings from a catalog-defined parameter model", () => {
    expect(validateCatalogParameterValues(definitions, { unitStatus: "occupied", includeUnavailable: true })).toEqual([]);
  });

  it("rejects unknown or credential-like parameter values", () => {
    expect(validateCatalogParameterValues(definitions, { unitStatus: "unsupported", password: "no" })).toEqual(expect.arrayContaining(["Unit status must use an approved option.", "Unsupported report parameter: password.", "Credential, token, and cookie parameters are not permitted."]));
  });
});
