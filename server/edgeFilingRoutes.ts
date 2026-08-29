import type { Express, Request, Response } from "express";
import express from "express";
import { fileOneSite60001BrowserWorkbook } from "./browserBatchFiling";
import { verifyEdgeFilingCapability } from "./edgeFilingTransfer";
import { afterHoursWorkMessage, isOutsideWorkHours } from "./workHours";

const MAX_WORKBOOK_BYTES = 25 * 1024 * 1024;

function extensionIdFromOrigin(origin: string | undefined) {
  const match = /^chrome-extension:\/\/([a-p]{32})$/.exec(origin ?? "");
  return match?.[1] ?? null;
}

function applyCors(response: Response, origin: string) {
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Onesite-Filename, X-Onesite-Property");
  response.setHeader("Vary", "Origin");
}

function capability(request: Request, extensionId: string) {
  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return verifyEdgeFilingCapability(token, { extensionId });
}

export function registerEdgeFilingRoutes(app: Express) {
  app.options("/api/edge-filing/onesite-60001", (request, response) => {
    const extensionId = extensionIdFromOrigin(request.get("origin"));
    if (!extensionId) return response.status(403).end();
    applyCors(response, `chrome-extension://${extensionId}`);
    return response.status(204).end();
  });

  app.post("/api/edge-filing/onesite-60001", express.raw({ type: "application/octet-stream", limit: `${MAX_WORKBOOK_BYTES}b` }), async (request, response) => {
    const extensionId = extensionIdFromOrigin(request.get("origin"));
    if (!extensionId) return response.status(403).json({ error: "The request must come from the paired Edge companion." });
    applyCors(response, `chrome-extension://${extensionId}`);
    try {
      if (isOutsideWorkHours()) throw new Error(afterHoursWorkMessage);
      const payload = capability(request, extensionId);
      const propertyName = request.get("x-onesite-property")?.trim() ?? "";
      const originalFilename = request.get("x-onesite-filename")?.trim() ?? "";
      const body = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
      if (!propertyName || !originalFilename || !body.length || body.length > MAX_WORKBOOK_BYTES) throw new Error("The direct transfer workbook is missing or exceeds the 25 MB limit.");
      if (!payload.pendingPropertyNames.includes(propertyName)) throw new Error("This property is not an eligible pending Request #60001 workbook.");
      const result = await fileOneSite60001BrowserWorkbook({ propertyName, originalFilename, dataBase64: body.toString("base64") });
      return response.status(200).json(result);
    } catch (caught) {
      return response.status(400).json({ error: caught instanceof Error ? caught.message : "The Edge workbook transfer could not be completed." });
    }
  });
}
