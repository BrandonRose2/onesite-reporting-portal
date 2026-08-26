import { describe, expect, it } from "vitest";
import { assertRequestTransition, canTransitionRequest } from "./requestLifecycle";

describe("report request lifecycle", () => {
  it("allows a runner claim and valid completion paths", () => {
    expect(canTransitionRequest("queued", "claimed")).toBe(true);
    expect(canTransitionRequest("claimed", "in_progress")).toBe(true);
    expect(canTransitionRequest("in_progress", "completed")).toBe(true);
    expect(canTransitionRequest("claimed", "completed_with_warnings")).toBe(true);
    expect(() => assertRequestTransition("claimed", "failed")).not.toThrow();
  });

  it("blocks terminal-state rewrites and skipped queue claims", () => {
    expect(canTransitionRequest("queued", "completed")).toBe(false);
    expect(canTransitionRequest("completed", "in_progress")).toBe(false);
    expect(() => assertRequestTransition("completed_with_warnings", "completed")).toThrow("cannot transition");
  });
});

