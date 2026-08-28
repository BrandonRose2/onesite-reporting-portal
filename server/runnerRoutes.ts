import { timingSafeEqual } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";
import {
  claimRunnerRequest,
  completeRunnerRequest,
  createReportDocument,
  getExistingRunnerDocument,
  getPropertyByName,
  getRunnerReconciliation,
  recordRunnerProgress,
  requestBelongsToSource,
  setLiveEdgeStatus,
  syncCatalogFromRunner,
  syncPropertiesFromRunner,
  syncPropertyContactsFromRunner,
  type RunnerSource,
} from "./db";
import { storagePut } from "./storage";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const validCompletionStatuses = new Set(["completed", "completed_with_warnings", "failed"]);
const sensitiveKeyPattern = /(password|passcode|cookie|credential|access[_-]?token|refresh[_-]?token|authorization|secret|session[_-]?(id|token))/i;
const sensitiveValuePattern = /(password\s*[=:]|cookie\s*[=:]|bearer\s+|token\s*[=:]|secret\s*[=:]|sessionid\s*[=:])/i;

type RunnerDefinition = {
  source: RunnerSource;
  tokenEnv: "ONESITE_RUNNER_TOKEN" | "YARDI_RUNNER_TOKEN";
  storageRoot: string;
};

const runners: RunnerDefinition[] = [
  { source: "onesite", tokenEnv: "ONESITE_RUNNER_TOKEN", storageRoot: "OneSite-Reporting" },
  { source: "yardi", tokenEnv: "YARDI_RUNNER_TOKEN", storageRoot: "Yardi-Reporting" },
];

function hasValidRunnerToken(token: string | undefined, expected: string | undefined) {
  if (!expected || !token) return false;
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function runnerAuth(definition: RunnerDefinition) {
  return (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env[definition.tokenEnv];
    if (!expected) {
      res.status(503).json({ error: `${definition.source} runner API is not configured. Set ${definition.tokenEnv} through the deployment secret manager.` });
      return;
    }
    if (!hasValidRunnerToken(req.get("x-runner-token") ?? req.get("x-onesite-runner-token") ?? req.get("x-yardi-runner-token") ?? undefined, expected)) {
      res.status(401).json({ error: "Invalid runner token." });
      return;
    }
    next();
  };
}

function containsSensitiveMaterial(value: unknown): boolean {
  if (typeof value === "string") return sensitiveValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsSensitiveMaterial);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nested]) => sensitiveKeyPattern.test(key) || containsSensitiveMaterial(nested));
}

function rejectSensitivePayload(req: Request, res: Response, next: NextFunction) {
  if (containsSensitiveMaterial(req.body)) {
    res.status(400).json({ error: "Credential, token, and cookie material must never be sent to the portal." });
    return;
  }
  next();
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

type RunnerCatalogReport = { catalogKey: string; name: string; reportArea?: string; reportLevel?: string; product?: string; availableFormats?: Array<"excel" | "pdf" | "csv">; runnerMetadata?: Record<string, unknown> };

export function validateCompleteCatalogSync(input: unknown): { reports: RunnerCatalogReport[]; expectedTotal: number } | { error: string } {
  const payload = input && typeof input === "object" ? input as { reports?: unknown; complete?: unknown; expectedTotal?: unknown } : {};
  const reports = Array.isArray(payload.reports) ? payload.reports : [];
  if (!reports.every((report: unknown) => report && typeof report === "object" && typeof (report as { catalogKey?: unknown }).catalogKey === "string" && typeof (report as { name?: unknown }).name === "string")) {
    return { error: "Reports must contain catalogKey and name." };
  }
  if (payload.complete !== true) return { error: "Catalog synchronization requires a verified complete report set." };
  if (!isPositiveInteger(payload.expectedTotal) || payload.expectedTotal !== reports.length) {
    return { error: "Catalog expectedTotal must be a positive integer equal to the submitted report count." };
  }
  return { reports: reports as RunnerCatalogReport[], expectedTotal: payload.expectedTotal };
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "report.bin";
}

function safeFolderName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").trim().slice(0, 120) || "Unassigned-Property";
}

async function requireOwnedRequest(requestId: number, source: RunnerSource, res: Response) {
  if (!isPositiveInteger(requestId)) {
    res.status(400).json({ error: "A valid request ID is required." });
    return false;
  }
  if (!await requestBelongsToSource(requestId, source)) {
    res.status(404).json({ error: "Request was not found for this runner source." });
    return false;
  }
  return true;
}

function registerRoutesForRunner(app: Express, definition: RunnerDefinition) {
  const base = `/api/${definition.source}-runner`;
  const auth = runnerAuth(definition);

  app.get(`${base}/health`, auth, (_req, res) => {
    res.json({ status: "ok", service: "onesite-reporting-hub", source: definition.source, credentialStorage: "external" });
  });

  const sessionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.body?.status;
      if (!(["ready", "unavailable", "interactive_required"] as string[]).includes(status)) {
        res.status(400).json({ error: "Invalid runner session status." });
        return;
      }
      const detail = typeof req.body?.detail === "string" ? req.body.detail.slice(0, 500) : undefined;
      if (detail && sensitiveValuePattern.test(detail)) {
        res.status(400).json({ error: "Session detail may not include credential or cookie material." });
        return;
      }
      await setLiveEdgeStatus(definition.source, { status, detail });
      res.json({ success: true, source: definition.source });
    } catch (error) { next(error); }
  };
  app.post(`${base}/session-status`, auth, rejectSensitivePayload, sessionStatus);
  app.post(`${base}/live-edge-status`, auth, rejectSensitivePayload, sessionStatus);

  app.post(`${base}/catalog/sync`, auth, rejectSensitivePayload, async (req, res, next) => {
    try {
      const catalogSync = validateCompleteCatalogSync(req.body);
      if ("error" in catalogSync) {
        res.status(400).json({ error: catalogSync.error });
        return;
      }
      await syncCatalogFromRunner(definition.source, catalogSync.reports, { complete: true, expectedTotal: catalogSync.expectedTotal });
      res.json({ success: true, source: definition.source, count: catalogSync.reports.length });
    } catch (error) { next(error); }
  });

  app.post(`${base}/properties/sync`, auth, rejectSensitivePayload, async (req, res, next) => {
    try {
      const properties = Array.isArray(req.body?.properties) ? req.body.properties : [];
      if (!properties.every((property: unknown) => property && typeof property === "object" && typeof (property as { externalId?: unknown }).externalId === "string" && typeof (property as { name?: unknown }).name === "string")) {
        res.status(400).json({ error: "Properties must contain externalId and name." });
        return;
      }
      await syncPropertiesFromRunner(definition.source, properties as Array<{ externalId: string; name: string; market?: string; active?: boolean }>);
      res.json({ success: true, source: definition.source, count: properties.length });
    } catch (error) { next(error); }
  });

  app.post(`${base}/property-contacts/sync`, auth, rejectSensitivePayload, async (req, res, next) => {
    try {
      const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
      await syncPropertyContactsFromRunner(contacts.filter((contact: unknown): contact is Record<string, unknown> => Boolean(contact) && typeof contact === "object"));
      res.json({ success: true, source: definition.source, count: contacts.length });
    } catch (error) { next(error); }
  });

  app.post(`${base}/requests/claim`, auth, rejectSensitivePayload, async (req, res, next) => {
    try {
      const requestId = isPositiveInteger(req.body?.requestId) ? req.body.requestId : undefined;
      const minimumRequestId = isPositiveInteger(req.body?.minimumRequestId) ? req.body.minimumRequestId : undefined;
      res.json(await claimRunnerRequest({ source: definition.source, requestId, minimumRequestId }));
    } catch (error) { next(error); }
  });

  app.post(`${base}/requests/:requestId/progress`, auth, rejectSensitivePayload, async (req, res, next) => {
    try {
      const requestId = Number(req.params.requestId);
      const sourceRunReference = req.body?.sourceRunReference;
      if (!await requireOwnedRequest(requestId, definition.source, res)) return;
      if (typeof sourceRunReference !== "string" || !sourceRunReference.trim()) {
        res.status(400).json({ error: "A source run reference is required." });
        return;
      }
      await recordRunnerProgress(requestId, sourceRunReference.slice(0, 500));
      res.json({ success: true, source: definition.source });
    } catch (error) { next(error); }
  });

  app.get(`${base}/requests/:requestId/reconciliation`, auth, async (req, res, next) => {
    try {
      const requestId = Number(req.params.requestId);
      if (!await requireOwnedRequest(requestId, definition.source, res)) return;
      const reconciliation = await getRunnerReconciliation(requestId, definition.source);
      if (!reconciliation) {
        res.status(404).json({ error: "Request was not found for this runner source." });
        return;
      }
      res.json({ source: definition.source, ...reconciliation });
    } catch (error) { next(error); }
  });

  app.post(`${base}/requests/:requestId/documents`, auth, async (req, res, next) => {
    try {
      const requestId = Number(req.params.requestId);
      const { propertyName, originalFilename, mimeType, dataBase64, documentKind = "source_report" } = req.body ?? {};
      if (!await requireOwnedRequest(requestId, definition.source, res)) return;
      if (typeof propertyName !== "string" || typeof originalFilename !== "string" || typeof mimeType !== "string" || typeof dataBase64 !== "string") {
        res.status(400).json({ error: "Document metadata and dataBase64 are required." });
        return;
      }
      if (documentKind !== "source_report" && documentKind !== "property_workbook" && documentKind !== "workbook_html") {
        res.status(400).json({ error: "Unsupported document kind." });
        return;
      }
      const data = Buffer.from(dataBase64, "base64");
      if (!data.length || data.length > MAX_UPLOAD_BYTES) {
        res.status(413).json({ error: "Document must be between 1 byte and 25 MB." });
        return;
      }
      const property = await getPropertyByName(propertyName, definition.source);
      const filename = safeFilename(originalFilename);
      const existing = await getExistingRunnerDocument({ requestId, source: definition.source, propertyId: property?.id, propertyName: propertyName.slice(0, 255), originalFilename: filename, documentKind });
      if (existing) {
        res.json({ success: true, source: definition.source, existing: true, key: existing.key, url: existing.url });
        return;
      }
      const propertyFolder = safeFolderName(property?.name ?? propertyName);
      const filingDate = new Date().toISOString().slice(0, 10);
      const storageKey = `${definition.storageRoot}/${propertyFolder}/${filingDate}/${requestId}-${nanoid(10)}-${filename}`;
      const stored = await storagePut(storageKey, data, mimeType);
      await createReportDocument({ requestId, source: definition.source, propertyId: property?.id, propertyName: propertyName.slice(0, 255), originalFilename: filename, mimeType: mimeType.slice(0, 255), documentKind, storageKey: stored.key, storageUrl: stored.url, sizeBytes: data.length });
      res.json({ success: true, source: definition.source, key: stored.key, url: stored.url });
    } catch (error) { next(error); }
  });

  app.post(`${base}/requests/:requestId/complete`, auth, rejectSensitivePayload, async (req, res, next) => {
    try {
      const requestId = Number(req.params.requestId);
      const { status, warningSummary, errorMessage, summaryMarkdown } = req.body ?? {};
      if (!await requireOwnedRequest(requestId, definition.source, res)) return;
      if (!validCompletionStatuses.has(status)) {
        res.status(400).json({ error: "A valid completion status is required." });
        return;
      }
      await completeRunnerRequest({ requestId, status, warningSummary: typeof warningSummary === "string" ? warningSummary : undefined, errorMessage: typeof errorMessage === "string" ? errorMessage : undefined, summaryMarkdown: typeof summaryMarkdown === "string" ? summaryMarkdown : undefined });
      res.json({ success: true, source: definition.source });
    } catch (error) { next(error); }
  });
}

export function registerRunnerRoutes(app: Express) {
  runners.forEach(definition => registerRoutesForRunner(app, definition));
}
