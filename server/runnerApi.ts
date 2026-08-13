import { timingSafeEqual } from "node:crypto";
import type { Express, Request } from "express";
import { and, asc, eq } from "drizzle-orm";
import { properties, reportDocuments, reportRequests, runnerConnectionStatuses } from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut } from "./storage";

function isAuthorized(req: Request) {
  const expected = process.env.ONESITE_RUNNER_TOKEN;
  const provided = req.header("x-onesite-runner-token") ?? "";
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

function safeParameters(value: string | null) {
  try { return value ? JSON.parse(value) : {}; } catch { return {}; }
}

function safeFilename(filename: string) {
  return filename.replace(/[\\/\0]/g, "_").slice(-512) || "onesite-report.bin";
}

export function registerOneSiteRunnerApi(app: Express) {
  app.get("/api/onesite-runner/health", (req, res) => {
    if (!isAuthorized(req)) {
      res.status(401).json({ ok: false, error: "Unauthorized runner" });
      return;
    }
    res.status(200).json({ ok: true, service: "onesite-reporting-hub" });
  });

  app.post("/api/onesite-runner/live-edge-status", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized runner" });
    const status = req.body?.status;
    if (!['ready', 'unavailable', 'interactive_required'].includes(status)) return res.status(400).json({ ok: false, error: "A valid live Edge status is required" });
    const detail = typeof req.body?.detail === "string" ? req.body.detail.slice(0, 4096) : null;
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Reporting database unavailable" });
    const [existing] = await db.select().from(runnerConnectionStatuses).where(eq(runnerConnectionStatuses.runnerKey, "macos-live-edge")).limit(1);
    const now = new Date();
    if (existing) {
      await db.update(runnerConnectionStatuses).set({
        connectionMode: "live_microsoft_edge",
        status,
        detail,
        checkedAt: now,
        ...(status === "ready" ? { lastReadyAt: now } : {}),
      }).where(eq(runnerConnectionStatuses.id, existing.id));
    } else {
      await db.insert(runnerConnectionStatuses).values({
        runnerKey: "macos-live-edge",
        connectionMode: "live_microsoft_edge",
        status,
        detail,
        checkedAt: now,
        ...(status === "ready" ? { lastReadyAt: now } : {}),
      });
    }
    res.status(200).json({ ok: true, status });
  });

  app.post("/api/onesite-runner/requests/claim", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized runner" });
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Reporting database unavailable" });
    const [request] = await db.select().from(reportRequests)
      .where(and(eq(reportRequests.sourceSystem, "realpage"), eq(reportRequests.status, "queued")))
      .orderBy(asc(reportRequests.requestedAt))
      .limit(1);
    if (!request) return res.status(200).json({ ok: true, request: null });
    await db.update(reportRequests).set({ status: "running", startedAt: new Date() }).where(eq(reportRequests.id, request.id));
    const activeProperties = await db.select({ id: properties.id, externalId: properties.externalId, name: properties.name })
      .from(properties).where(eq(properties.isActive, true)).orderBy(asc(properties.name));
    res.status(200).json({ ok: true, request: { ...request, status: "running", parameters: safeParameters(request.parameterJson) }, properties: activeProperties });
  });

  app.post("/api/onesite-runner/requests/:requestId/documents", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized runner" });
    const requestId = Number(req.params.requestId);
    const propertyName = typeof req.body?.propertyName === "string" ? req.body.propertyName.trim() : "";
    const originalFilename = typeof req.body?.originalFilename === "string" ? safeFilename(req.body.originalFilename) : "";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType.slice(0, 120) : "application/octet-stream";
    const dataBase64 = typeof req.body?.dataBase64 === "string" ? req.body.dataBase64 : "";
    if (!Number.isInteger(requestId) || !propertyName || !originalFilename || !dataBase64) return res.status(400).json({ ok: false, error: "Request ID, property name, filename, and file data are required" });
    const data = Buffer.from(dataBase64, "base64");
    if (!data.length) return res.status(400).json({ ok: false, error: "The submitted file is empty" });
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Reporting database unavailable" });
    const [request] = await db.select().from(reportRequests).where(eq(reportRequests.id, requestId));
    if (!request || request.sourceSystem !== "realpage") return res.status(404).json({ ok: false, error: "Report request not found" });
    const [property] = await db.select().from(properties).where(eq(properties.name, propertyName));
    if (!property) return res.status(400).json({ ok: false, error: `No active portal property matches ${propertyName}` });
    const stored = await storagePut(`onesite-reports/${requestId}/${property.externalId}/${originalFilename}`, data, mimeType);
    const inserted = await db.insert(reportDocuments).values({ reportRequestId: requestId, propertyId: property.id, documentKind: "source_report", originalFilename, storageKey: stored.key, storageUrl: stored.url, mimeType, fileSizeBytes: data.length });
    await db.update(reportRequests).set({ documentCount: request.documentCount + 1 }).where(eq(reportRequests.id, requestId));
    res.status(201).json({ ok: true, documentId: Number(inserted[0].insertId), propertyId: property.id });
  });

  app.post("/api/onesite-runner/requests/:requestId/complete", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized runner" });
    const requestId = Number(req.params.requestId);
    const status = req.body?.status;
    if (!Number.isInteger(requestId) || !["completed", "completed_with_warnings", "failed"].includes(status)) return res.status(400).json({ ok: false, error: "A valid completed, completed_with_warnings, or failed status is required" });
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Reporting database unavailable" });
    const [request] = await db.select().from(reportRequests).where(eq(reportRequests.id, requestId));
    if (!request || request.sourceSystem !== "realpage") return res.status(404).json({ ok: false, error: "Report request not found" });
    await db.update(reportRequests).set({
      status,
      warningSummary: typeof req.body?.warningSummary === "string" ? req.body.warningSummary.slice(0, 65535) : null,
      errorMessage: typeof req.body?.errorMessage === "string" ? req.body.errorMessage.slice(0, 65535) : null,
      summaryMarkdown: typeof req.body?.summaryMarkdown === "string" ? req.body.summaryMarkdown.slice(0, 65535) : null,
      completedAt: new Date(),
    }).where(eq(reportRequests.id, requestId));
    res.status(200).json({ ok: true });
  });
}
