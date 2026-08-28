import { describe, expect, it } from "vitest";
import { getProviderSelectedPropertyCount } from "./db";

describe("OneSite runner reconciliation", () => {
  it("uses the explicit provider-selected scope rather than the portal directory snapshot", () => {
    expect(getProviderSelectedPropertyCount({ portalDirectorySnapshotCount: 38, providerSelectedPropertyCount: 35 })).toBe(35);
  });

  it("supports the persisted nested generation settings and rejects incomplete scope evidence", () => {
    expect(getProviderSelectedPropertyCount({ generationSettings: { reportParameters: { providerSelectedPropertyCount: 35 } } })).toBe(35);
    expect(getProviderSelectedPropertyCount({ portalDirectorySnapshotCount: 38 })).toBeNull();
    expect(getProviderSelectedPropertyCount({ providerSelectedPropertyCount: 35.5 })).toBeNull();
  });
});
