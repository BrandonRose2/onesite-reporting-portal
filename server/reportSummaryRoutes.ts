import type { Express, Request, Response } from "express";
import { getRequestDetails } from "./db";
import { getManagerContactMatch } from "./db";
import { sdk } from "./_core/sdk";
import { storageGetSignedUrl } from "./storage";
import { renderWorkbookDataHtml } from "./workbookSummary";

const workbookFilePattern = /\.(xlsx|xls|xlsm|csv)$/i;

export function registerReportSummaryRoutes(app: Express) {
  app.get("/api/report-summaries/:requestId", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        res.status(401).type("text/plain").send("Sign in to Property Reports to view this workbook summary.");
        return;
      }
      const requestId = Number(req.params.requestId);
      if (!Number.isInteger(requestId) || requestId < 1) {
        res.status(400).type("text/plain").send("A valid report request ID is required.");
        return;
      }
      const details = await getRequestDetails(requestId);
      if (!details || !["completed", "completed_with_warnings"].includes(details.request.status)) {
        res.status(404).type("text/plain").send("A completed report workbook is not available for this request.");
        return;
      }
      const workbook = details.documents.find(document => document.documentKind === "source_report" && workbookFilePattern.test(document.originalFilename));
      if (!workbook) {
        res.status(404).type("text/plain").send("No filed workbook is available for this request.");
        return;
      }
      const signedUrl = await storageGetSignedUrl(workbook.storageKey);
      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) throw new Error(`Stored workbook could not be read (${fileResponse.status}).`);
      const propertyNames = details.properties.map(property => property.name);
      const contactMatches = await Promise.all(propertyNames.map(async propertyName => ({ propertyName, ...(await getManagerContactMatch(propertyName)) })));
      const html = renderWorkbookDataHtml({ source: details.request.source, requestId, reportName: details.request.requestedReportName, propertyNames, originalFilename: workbook.originalFilename, originalFileUrl: workbook.storageUrl, workbookBytes: await fileResponse.arrayBuffer(), contactMatches });
      res.setHeader("Cache-Control", "private, no-store");
      res.type("html").send(html);
    } catch (error) {
      console.error("[Report summary] Failed to render workbook data", error);
      res.status(500).type("text/plain").send("The workbook data summary could not be generated. The original workbook remains available in the report library.");
    }
  });
}
