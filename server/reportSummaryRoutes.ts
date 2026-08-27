import type { Express, Request, Response } from "express";
import { getRequestDetails } from "./db";
import { sdk } from "./_core/sdk";

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
      res.redirect(302, `/report-data/${requestId}`);
    } catch (error) {
      console.error("[Report summary] Failed to render workbook data", error);
      res.status(500).type("text/plain").send("The workbook data summary could not be generated. The original workbook remains available in the report library.");
    }
  });
}
