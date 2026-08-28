import { describe, expect, it } from "vitest";
import { getCatalogParameterDefinitions, getCompleteProviderEligiblePropertyNames, requiresProviderEligibility, validateCatalogParameterValues } from "./reportParameters";

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

  it("uses only a complete, unique provider eligibility list for all-properties scope", () => {
    expect(getCompleteProviderEligiblePropertyNames({
      providerEligibility: {
        complete: true,
        completionEvidence: "terminal_virtual_list_traversal",
        capturedAt: "2026-08-28T00:00:00Z",
        properties: [{ name: "Boca Ciega Townhomes", providerId: "1482145" }, { name: "Bayou Pointe", providerId: "5204960" }],
      },
    })).toEqual(["Bayou Pointe", "Boca Ciega Townhomes"]);
    expect(getCompleteProviderEligiblePropertyNames({
      providerEligibility: { complete: false, properties: [{ name: "Boca Ciega Townhomes", providerId: "1482145" }] },
    })).toBeNull();
    expect(getCompleteProviderEligiblePropertyNames({
      providerEligibility: {
        complete: true,
        completionEvidence: "terminal_virtual_list_traversal",
        capturedAt: "2026-08-28T00:00:00Z",
        properties: [{ name: "Boca Ciega Townhomes", providerId: "1482145" }, { name: "boca ciega townhomes", providerId: "999" }],
      },
    })).toBeNull();
  });

  it("requires an eligibility scope when report metadata declares one", () => {
    expect(requiresProviderEligibility({ requiresProviderEligibility: true })).toBe(true);
    expect(requiresProviderEligibility({ providerEligibility: { complete: false } })).toBe(true);
    expect(requiresProviderEligibility({})).toBe(false);
  });
});
