import { describe, expect, it } from "vitest";
import { knownOperationalLimitations } from "./operationalLimitations";

describe("known operational limitations", () => {
  it("retains the explicit My Reports safety limitation", () => {
    expect(knownOperationalLimitations.some(item => item.includes("My Reports discovery") && item.includes("unverified"))).toBe(true);
  });

  it("states the credential storage boundary", () => {
    expect(knownOperationalLimitations.some(item => item.includes("credentials") && item.includes("outside portal source code"))).toBe(true);
  });
});

