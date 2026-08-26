import { timingSafeEqual } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { nanoid } from "nanoid";
import {
  claimRunnerRequest,
  completeRunnerRequest,
  createReportDocument,
  getPropertyByName,
  recordRunnerProgress,
  setLiveEdgeStatus,
  syncCatalogFromRunner,
  syncPropertyContactsFromRunner,
} from "./db";
import { storagePut } from "./storage";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const validCompletionStatuses = new Set(["completed", "completed_with_warnings", "failed"]);

function hasValidRunnerToken(token: string | undefined) {
  const expected = process.env.ONESITE_RUNNER_TOKEN;
  if (!expected || !token) return false;
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function runnerAuth(req: Request, res: Response, next: NextFunction) {
  if (!process.env.ONESITE_RUNNER_TOKEN) {
    res.status(503).json({ error: "Runner API is not configured. Set ONESITE_RUNNER_TOKEN through the portal’s secret manager." });
    return;
  }
  if (!hasValidRunnerToken(req.get("x-onesite-runner-token") ?? undefined)) {
    res.status(401).json({ error: "Invalid runner token." });
    return;
  }
  next();
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "report.bin";
}

export function registerRunnerRoutes(app: Express) {
  const router = app.route.bind(app);

  router("/api/onesite-runner/health").get(runnerAuth, (_req, res) => {
    res.json({ status: "ok", service: "onesite-reporting-hub" });
  });

  router("/api/onesite-runner/live-edge-status").post(runnerAuth, async (req, res, next) => {
    try {
      const status = req.body?.status;
      if (!["ready", "unavailable", "interactive_required"].includes(status)) {
        res.status(400).json({ error: "Invalid live Edge status." });
        return;
      }
      await setLiveEdgeStatus({ status, detail: typeof req.body.detail === "string" ? req.body.detail.slice(0, 1500) : undefined });
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  router("/api/onesite-runner/catalog/sync").post(runnerAuth, async (req, res, next) => {
    try {
      const reports = Array.isArray(req.body?.reports) ? req.body.reports : [];
      if (!reports.every((report: unknown) => report && typeof report === "object" && typeof (report as { catalogKey?: unknown }).catalogKey === "string" && typeof (report as { name?: unknown }).name === "string")) {
        res.status(400).json({ error: "Reports must contain catalogKey and name." });
        return;
      }
      await syncCatalogFromRunner(reports);
      res.json({ success: true, count: reports.length });
    } catch (error) { next(error); }
  });

  router("/api/onesite-runner/property-contacts/sync").post(runnerAuth, async (req, res, next) => {
    try {
      const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
      await syncPropertyContactsFromRunner(contacts.filter((contact: unknown): contact is Record<string, unknown> => Boolean(contact) && typeof contact === "object"));
      res.json({ success: true, count: contacts.length });
    } catch (error) { next(error); }
  });

  router("/api/onesite-runner/requests/claim").post(runnerAuth, async (req, res, next) => {
    try {
      const requestId = isPositiveInteger(req.body?.requestId) ? req.body.requestId : undefined;
      const minimumRequestId = isPositiveInteger(req.body?.minimumRequestId) ? req.body.minimumRequestId : undefined;
      res.json(await claimRunnerRequest({ requestId, minimumRequestId }));
    } catch (error) { next(error); }
  });

  router("/api/onesite-runner/requests/:requestId/progress").post(runnerAuth, async (req, res, next) => {
    try {
      const requestId = Number(req.params.requestId);
      const sourceRunReference = req.body?.sourceRunReference;
      if (!isPositiveInteger(requestId) || typeof sourceRunReference !== "string" || !sourceRunReference.trim()) {
        res.status(400).json({ error: "A request ID and source run reference are required." });
        return;
      }
      await recordRunnerProgress(requestId, sourceRunReference.slice(0, 500));
      res.json({ success: true });
    } catch (error) { next(error); }
  });

  router("/api/onesite-runner/requests/:requestId/documents").post(runnerAuth, async (req, res, next) => {
    try {
      const requestId = Number(req.params.requestId);
      const { propertyName, originalFilename, mimeType, dataBase64, documentKind = "source_report" } = req.body ?? {};
      if (!isPositiveInteger(requestId) || typeof propertyName !== "string" || typeof originalFilename !== "string" || typeof mimeType !== "string" || typeof dataBase64 !== "string") {
        res.status(400).json({ error: "Document metadata and dataBase64 are required." });
        return;
      }
      if (documentKind !== "source_report" && documentKind !== "property_workbook") {
        res.status(400).json({ error: "Unsupported document kind." });
        return;
      }
      const data = Buffer.from(dataBase64, "base64");
      if (!data.length || data.length > MAX_UPLOAD_BYTES) {
        res.status(413).json({ error: "Document must be between 1 byte and 25 MB." });
        return;
      }
      const filename = safeFilename(originalFilename);
      const storageKey = `onesite-reports/requests/${requestId}/${Date.now()}-${nanoid(10)}-${filename}`;
      const stored = await storagePut(storageKey, data, mimeType);
      const property = await getPropertyByName(propertyName);
      await createReportDocument({
        requestId,
        propertyId: property?.id,
        propertyName: propertyName.slice(0, 255),
        originalFilename: filename,
        mimeType: mimeType.slice(0, 255),
        documentKind,
        storageKey: stored.key,
        storageUrl: stored.url,
        sizeBytes: data.length,
      });
      res.json({ success: true, key: stored.key, url: stored.url });
    } catch (error) { next(error); }
  });

  router("/api/onesite-runner/requests/:requestId/complete").post(runnerAuth, async (req, res, next) => {
    try {
      const requestId = Number(req.params.requestId);
      const { status, warningSummary, errorMessage, summaryMarkdown } = req.body ?? {};
      if (!isPositiveInteger(requestId) || !validCompletionStatuses.has(status)) {
        res.status(400).json({ error: "A valid request ID and completion status are required." });
        return;
      }
      await completeRunnerRequest({
        requestId,
        status,
        warningSummary: typeof warningSummary === "string" ? warningSummary : undefined,
        errorMessage: typeof errorMessage === "string" ? errorMessage : undefined,
        summaryMarkdown: typeof summaryMarkdown === "string" ? summaryMarkdown : undefined,
      });
      res.json({ success: true });
    } catch (error) { next(error); }
  });
}

