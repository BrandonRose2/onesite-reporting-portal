import { timingSafeEqual } from "node:crypto";
import type { Express, Request } from "express";
import { and, asc, desc, eq, gte, notInArray } from "drizzle-orm";
import { properties, propertyContacts, reportCatalog, reportDocuments, reportRequests, runnerConnectionStatuses } from "../drizzle/schema";
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

function safeStorageFilename(filename: string) {
  return safeFilename(filename).replace(/[^A-Za-z0-9._-]+/g, "_");
}

const ONESITE_EXECUTION_EXCLUDED_EXTERNAL_IDS = ["5083727", "5159418"];

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

  app.post("/api/onesite-runner/catalog/sync", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized runner" });
    const reports = Array.isArray(req.body?.reports) ? req.body.reports.slice(0, 400) : [];
    const unique = new Map<string, { catalogKey: string; name: string; reportArea: string | null; reportLevel: string | null; product: string | null }>();
    for (const entry of reports) {
      const catalogKey = typeof entry?.catalogKey === "string" ? entry.catalogKey.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) : "";
      const name = typeof entry?.name === "string" ? entry.name.replace(/\s+/g, " ").trim().slice(0, 255) : "";
      if (!catalogKey || !name) continue;
      unique.set(catalogKey, {
        catalogKey,
        name,
        reportArea: typeof entry?.reportArea === "string" ? entry.reportArea.replace(/\s+/g, " ").trim().slice(0, 160) || null : null,
        reportLevel: typeof entry?.reportLevel === "string" ? entry.reportLevel.replace(/\s+/g, " ").trim().slice(0, 80) || null : null,
        product: typeof entry?.product === "string" ? entry.product.replace(/\s+/g, " ").trim().slice(0, 160) || null : null,
      });
    }
    if (unique.size < 250) return res.status(400).json({ ok: false, error: "The live catalog appears incomplete; expected at least 250 report titles." });
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Reporting database unavailable" });
    let added = 0;
    let refreshed = 0;
    for (const entry of Array.from(unique.values())) {
      const [existing] = await db.select({ id: reportCatalog.id }).from(reportCatalog)
        .where(and(eq(reportCatalog.sourceSystem, "realpage"), eq(reportCatalog.slug, entry.catalogKey)))
        .limit(1);
      if (existing) {
        await db.update(reportCatalog).set({ displayName: entry.name, searchTerm: entry.name, reportArea: entry.reportArea, reportLevel: entry.reportLevel, product: entry.product, isActive: true, isApproved: true }).where(eq(reportCatalog.id, existing.id));
        refreshed += 1;
      } else {
        const [legacy] = await db.select({ id: reportCatalog.id }).from(reportCatalog)
          .where(and(eq(reportCatalog.sourceSystem, "realpage"), eq(reportCatalog.exactReportName, entry.name)))
          .limit(1);
        if (legacy && !entry.catalogKey.endsWith("-variant-2")) {
          await db.update(reportCatalog).set({ slug: entry.catalogKey, displayName: entry.name, searchTerm: entry.name, reportArea: entry.reportArea, reportLevel: entry.reportLevel, product: entry.product, isActive: true, isApproved: true }).where(eq(reportCatalog.id, legacy.id));
          refreshed += 1;
          continue;
        }
        await db.insert(reportCatalog).values({ sourceSystem: "realpage", slug: entry.catalogKey, displayName: entry.name, exactReportName: entry.name, searchTerm: entry.name, defaultFormat: "pdf", reportArea: entry.reportArea, reportLevel: entry.reportLevel, product: entry.product, isVerified: false, isApproved: true, isActive: true });
        added += 1;
      }
    }
    res.status(200).json({ ok: true, total: unique.size, added, refreshed });
  });

  app.post("/api/onesite-runner/property-contacts/sync", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized runner" });
    const entries = Array.isArray(req.body?.contacts) ? req.body.contacts.slice(0, 100) : [];
    if (!entries.length) return res.status(400).json({ ok: false, error: "At least one authorized property contact is required" });
    const sourcePageTitle = typeof req.body?.sourcePageTitle === "string" ? req.body.sourcePageTitle.trim().slice(0, 255) : "";
    const sourceUrl = typeof req.body?.sourceUrl === "string" ? req.body.sourceUrl.trim().slice(0, 1024) : null;
    if (sourcePageTitle !== "Company Contacts 7.23.26") return res.status(400).json({ ok: false, error: "Only the authorized Company Contacts 7.23.26 source may synchronize property contacts" });
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Reporting database unavailable" });
    const synced: number[] = [];
    for (const entry of entries) {
      const propertyId = Number(entry?.propertyId);
      if (!Number.isInteger(propertyId)) continue;
      const [property] = await db.select({ id: properties.id }).from(properties).where(and(eq(properties.id, propertyId), eq(properties.isActive, true))).limit(1);
      if (!property) continue;
      const safe = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) || null : null;
      const values = {
        managerName: safe(entry.managerName, 255), managerEmail: safe(entry.managerEmail, 320), mobilePhone: safe(entry.mobilePhone, 80), officePhone: safe(entry.officePhone, 80), extension: safe(entry.extension, 32),
        sourcePropertyName: safe(entry.sourcePropertyName, 255), sourcePageTitle, sourceUrl,
        mappingStatus: ["verified", "review_required", "unmapped"].includes(entry.mappingStatus) ? entry.mappingStatus : "review_required" as "verified" | "review_required" | "unmapped",
        sourceSyncedAt: new Date(),
      };
      const [existing] = await db.select({ id: propertyContacts.id }).from(propertyContacts).where(eq(propertyContacts.propertyId, propertyId)).limit(1);
      if (existing) await db.update(propertyContacts).set(values).where(eq(propertyContacts.id, existing.id));
      else await db.insert(propertyContacts).values({ propertyId, ...values });
      synced.push(propertyId);
    }
    res.status(200).json({ ok: true, syncedPropertyIds: synced });
  });

  app.post("/api/onesite-runner/requests/claim", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized runner" });
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Reporting database unavailable" });
    const requestedId = req.body?.requestId === undefined ? null : Number(req.body.requestId);
    if (requestedId !== null && !Number.isInteger(requestedId)) return res.status(400).json({ ok: false, error: "A valid request ID is required" });
    const minimumRequestId = req.body?.minimumRequestId === undefined ? null : Number(req.body.minimumRequestId);
    if (minimumRequestId !== null && (!Number.isInteger(minimumRequestId) || minimumRequestId < 1)) return res.status(400).json({ ok: false, error: "A valid minimum request ID is required" });
    const [request] = await db.select().from(reportRequests)
      .where(and(eq(reportRequests.sourceSystem, "realpage"), eq(reportRequests.status, "queued"), ...(requestedId === null ? [] : [eq(reportRequests.id, requestedId)]), ...(minimumRequestId === null ? [] : [gte(reportRequests.id, minimumRequestId)])))
      .orderBy(desc(reportRequests.requestedAt))
      .limit(1);
    if (!request) return res.status(200).json({ ok: true, request: null });
    await db.update(reportRequests).set({ status: "running", startedAt: new Date() }).where(eq(reportRequests.id, request.id));
    const activeProperties = await db.select({ id: properties.id, externalId: properties.externalId, name: properties.name })
      .from(properties).where(and(eq(properties.isActive, true), notInArray(properties.externalId, ONESITE_EXECUTION_EXCLUDED_EXTERNAL_IDS))).orderBy(asc(properties.name));
    const parameters = safeParameters(request.parameterJson);
    const scopedPropertyId = parameters.propertyScope === "specific_property" ? Number(parameters.propertyId) : null;
    const scopedProperties = scopedPropertyId && Number.isInteger(scopedPropertyId)
      ? activeProperties.filter(property => property.id === scopedPropertyId)
      : activeProperties;
    if (!scopedProperties.length) {
      await db.update(reportRequests).set({ status: "failed", errorMessage: "The requested specific property is no longer active in the portal.", completedAt: new Date() }).where(eq(reportRequests.id, request.id));
      return res.status(409).json({ ok: false, error: "The requested property is no longer active." });
    }
    res.status(200).json({ ok: true, request: { ...request, status: "running", parameters }, properties: scopedProperties });
  });

  app.post("/api/onesite-runner/requests/:requestId/progress", async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ ok: false, error: "Unauthorized runner" });
    const requestId = Number(req.params.requestId);
    const sourceRunReference = typeof req.body?.sourceRunReference === "string" ? req.body.sourceRunReference.slice(0, 160) : "";
    if (!Number.isInteger(requestId) || !sourceRunReference) return res.status(400).json({ ok: false, error: "A request ID and progress reference are required" });
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, error: "Reporting database unavailable" });
    const [request] = await db.select({ id: reportRequests.id, status: reportRequests.status }).from(reportRequests).where(eq(reportRequests.id, requestId)).limit(1);
    if (!request || request.status !== "running") return res.status(409).json({ ok: false, error: "Only a running report request can receive progress updates" });
    await db.update(reportRequests).set({ sourceRunReference }).where(eq(reportRequests.id, requestId));
    res.status(200).json({ ok: true });
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
    const stored = await storagePut(`onesite-reports/${requestId}/${property.externalId}/${safeStorageFilename(originalFilename)}`, data, mimeType);
    const [existingDocument] = await db.select({ id: reportDocuments.id }).from(reportDocuments)
      .where(and(eq(reportDocuments.reportRequestId, requestId), eq(reportDocuments.propertyId, property.id), eq(reportDocuments.originalFilename, originalFilename)))
      .limit(1);
    if (existingDocument) {
      await db.update(reportDocuments).set({ storageKey: stored.key, storageUrl: stored.url, mimeType, fileSizeBytes: data.length }).where(eq(reportDocuments.id, existingDocument.id));
      res.status(200).json({ ok: true, documentId: existingDocument.id, propertyId: property.id, refreshed: true });
      return;
    }
    const inserted = await db.insert(reportDocuments).values({ reportRequestId: requestId, propertyId: property.id, documentKind: "source_report", originalFilename, storageKey: stored.key, storageUrl: stored.url, mimeType, fileSizeBytes: data.length });
    await db.update(reportRequests).set({ documentCount: request.documentCount + 1 }).where(eq(reportRequests.id, requestId));
    res.status(201).json({ ok: true, documentId: Number(inserted[0].insertId), propertyId: property.id, refreshed: false });
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
