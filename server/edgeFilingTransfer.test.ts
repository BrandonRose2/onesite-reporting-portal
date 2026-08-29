import { describe, expect, it } from "vitest";
import { createEdgeFilingCapability, verifyEdgeFilingCapability } from "./edgeFilingTransfer";

const extensionId = "abcdefghijklmnopabcdefghijklmnop";
const secret = "unit-test-signing-secret";

describe("Edge filing capability", () => {
  it("is bound to the paired extension, Request #60001, pending properties, and its short expiry", () => {
    const capability = createEdgeFilingCapability({ extensionId, pendingPropertyNames: ["Grove Park Terrace"], now: 1_000, secret });
    expect(verifyEdgeFilingCapability(capability, { extensionId, now: 2_000, secret })).toMatchObject({ requestId: 60001, pendingPropertyNames: ["Grove Park Terrace"] });
    expect(() => verifyEdgeFilingCapability(capability, { extensionId: "ponmlkjihgfedcbaponmlkjihgfedcba", now: 2_000, secret })).toThrow(/does not match/);
    expect(() => verifyEdgeFilingCapability(capability, { extensionId, now: 1_000_000, secret })).toThrow(/expired/);
  });

  it("rejects a tampered capability", () => {
    const capability = createEdgeFilingCapability({ extensionId, pendingPropertyNames: ["Grove Park Terrace"], now: 1_000, secret });
    expect(() => verifyEdgeFilingCapability(`${capability}x`, { extensionId, now: 2_000, secret })).toThrow(/signature|invalid/);
  });
});

