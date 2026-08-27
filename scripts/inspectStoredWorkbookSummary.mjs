import { getRequestDetails } from "../server/db";
import { renderWorkbookDataHtml } from "../server/workbookSummary";

const requestId = Number(process.argv[2]);
if (!Number.isInteger(requestId) || requestId < 1) throw new Error("Usage: pnpm exec tsx scripts/inspectStoredWorkbookSummary.mjs <requestId>");

const details = await getRequestDetails(requestId);
if (!details) throw new Error(`Request ${requestId} was not found.`);
const workbook = details.documents.find(document => document.documentKind === "source_report" && /\.(xlsx|xls|xlsm|csv)$/i.test(document.originalFilename));
if (!workbook) throw new Error(`Request ${requestId} has no filed workbook.`);
const baseUrl = process.env.PORTAL_BASE_URL;
if (!baseUrl) throw new Error("PORTAL_BASE_URL is required to inspect the portal storage proxy.");
const response = await fetch(new URL(workbook.storageUrl, baseUrl), { redirect: "follow" });
if (!response.ok) throw new Error(`Stored workbook download through portal proxy failed (${response.status}).`);
const bytes = await response.arrayBuffer();
const html = renderWorkbookDataHtml({ source: details.request.source, requestId, reportName: details.request.requestedReportName, propertyNames: details.properties.map(property => property.name), originalFilename: workbook.originalFilename, originalFileUrl: workbook.storageUrl, workbookBytes: bytes });
console.log(JSON.stringify({ requestId, filename: workbook.originalFilename, sizeBytes: bytes.byteLength, contentType: response.headers.get("content-type"), summaryHtmlLength: html.length }));
