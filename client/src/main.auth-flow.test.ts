import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("portal OAuth login policy", () => {
  it("does not automatically restart login for unauthenticated query or mutation failures", () => {
    const source = readFileSync(fileURLToPath(new URL("./main.tsx", import.meta.url)), "utf8");

    expect(source).not.toContain("startLogin");
    expect(source).not.toContain("getQueryCache().subscribe");
    expect(source).not.toContain("getMutationCache().subscribe");
  });
});
