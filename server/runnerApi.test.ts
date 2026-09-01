import express from "express";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { registerOneSiteRunnerApi } from "./runnerApi";
import { PROVIDER_SESSIONS } from "./providerSessions";

describe("OneSite runner token", () => {
  // Requires the deployment secret; skipped on a checkout that has not configured it
  // so a fresh clone reports honestly instead of failing on a missing env var.
  it.skipIf(!process.env.ONESITE_RUNNER_TOKEN)("accepts the configured token at the lightweight runner health endpoint", async () => {
    const token = process.env.ONESITE_RUNNER_TOKEN!;
    const app = express();
    registerOneSiteRunnerApi(app);
    const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
      const running = app.listen(0, () => resolve(running));
    });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port.");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/onesite-runner/health`, { headers: { "x-onesite-runner-token": token } });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ ok: true, service: "onesite-reporting-hub" });
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it("rejects a missing runner credential", async () => {
    const app = express();
    registerOneSiteRunnerApi(app);
    const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
      const running = app.listen(0, () => resolve(running));
    });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port.");
      const response = await fetch(`http://127.0.0.1:${address.port}/api/onesite-runner/requests/claim`, { method: "POST" });
      expect(response.status).toBe(401);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it("registers a protected live Microsoft Edge readiness endpoint for each source site", () => {
    const source = readFileSync(new URL("./runnerApi.ts", import.meta.url), "utf8");
    expect(source).toContain('"/api/onesite-runner/live-edge-status"');
    expect(source).toContain('"x-onesite-runner-token"');
    // The runner key moved into the provider registry so OneSite and Yardi each
    // report their own session state instead of sharing one row.
    expect(source).toContain("resolveProvider(req.body?.provider)");
    expect(source).toContain("provider.runnerKey");
    expect(PROVIDER_SESSIONS.onesite.runnerKey).toBe("macos-live-edge");
    expect(PROVIDER_SESSIONS.yardi.runnerKey).not.toBe(PROVIDER_SESSIONS.onesite.runnerKey);
  });

  it("lets a Yardi runner claim, file, and complete its own requests", () => {
    const source = readFileSync(new URL("./runnerApi.ts", import.meta.url), "utf8");
    expect(source).toContain("resolveSourceSystem(req.body?.sourceSystem)");
    expect(source).toContain("eq(reportRequests.sourceSystem, sourceSystem)");
    // A Yardi run must never fall back to the whole portfolio.
    expect(source).toContain('eq(propertySources.sourceSystem, "yardi")');
    expect(source).toContain("No active property is mapped to Yardi");
    expect(source).not.toContain('request.sourceSystem !== "realpage"');
  });

  it("registers a protected authorized property-contact synchronization endpoint", () => {
    const source = readFileSync(new URL("./runnerApi.ts", import.meta.url), "utf8");
    expect(source).toContain('"/api/onesite-runner/property-contacts/sync"');
    expect(source).toContain('sourcePageTitle !== "Company Contacts 7.23.26"');
    expect(source).toContain("propertyContacts");
  });

  it("supports an explicit authorized request ID when claiming a queued report", () => {
    const source = readFileSync(new URL("./runnerApi.ts", import.meta.url), "utf8");
    expect(source).toContain("req.body?.requestId");
    expect(source).toContain("eq(reportRequests.id, requestedId)");
  });

  it("returns only the selected property for a specific-property request", () => {
    const source = readFileSync(new URL("./runnerApi.ts", import.meta.url), "utf8");
    expect(source).toContain('parameters.propertyScope === "specific_property"');
    expect(source).toContain("scopedProperties");
    expect(source).toContain("property.id === scopedPropertyId");
  });

  it("excludes the two unrecognized Granite properties from future OneSite execution claims", () => {
    const source = readFileSync(new URL("./runnerApi.ts", import.meta.url), "utf8");
    expect(source).toContain('ONESITE_EXECUTION_EXCLUDED_EXTERNAL_IDS = ["5083727", "5159418"]');
    expect(source).toContain("notInArray(properties.externalId, ONESITE_EXECUTION_EXCLUDED_EXTERNAL_IDS)");
  });

  it("uses whitespace-safe storage keys and refreshes an existing workbook rather than duplicating it", () => {
    const source = readFileSync(new URL("./runnerApi.ts", import.meta.url), "utf8");
    expect(source).toContain("safeStorageFilename(originalFilename)");
    expect(source).toContain("existingDocument");
    expect(source).toContain("refreshed: true");
    expect(source).toContain('req.body?.documentKind === "property_workbook"');
  });

  it("accepts a complete live OneSite catalog while retaining existing verified report configurations", () => {
    const source = readFileSync(new URL("./runnerApi.ts", import.meta.url), "utf8");
    expect(source).toContain("/api/onesite-runner/catalog/sync");
    expect(source).toContain("unique.size < 250");
    expect(source).toContain("isVerified: false");
    expect(source).toContain("eq(reportCatalog.slug, entry.catalogKey)");
    expect(source).toContain("entry.catalogKey.endsWith(\"-variant-2\")");
    expect(source).not.toContain("notInArray(reportCatalog.slug, activeCatalogKeys)");
  });
});
