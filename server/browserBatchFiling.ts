import { nanoid } from "nanoid";
import { createReportDocumentPair, getManagerContactMatch, getPropertyByName, getRunnerReconciliation } from "./db";
import { ONESITE_60001, getOneSite60001FilingPlan } from "./onesiteBatchFiling";
import { storagePut } from "./storage";
import { renderWorkbookDataHtml } from "./workbookSummary";

const MAX_WORKBOOK_BYTES = 25 * 1024 * 1024;

function safeFilename(filename: string) {
  const normalized = filename.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 180) throw new Error("Choose a valid workbook filename of 180 characters or fewer.");
  if (!/\.xls[x]?$/i.test(normalized)) throw new Error("Only .xls and .xlsx workbooks are accepted for this filing batch.");
  return normalized;
}

function safeFolderName(value: string) {
  return value.normalize("NFKC").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "unmatched-property";
}

function decodeBase64(value: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error("The uploaded workbook could not be read. Choose the original .xls or .xlsx download again.");
  const bytes = Buffer.from(value, "base64");
  if (!bytes.length || bytes.length > MAX_WORKBOOK_BYTES) throw new Error("Each workbook must be between 1 byte and 25 MB.");
  return bytes;
}

function contentType(filename: string) {
  return filename.toLowerCase().endsWith(".xlsx")
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/vnd.ms-excel";
}

export async function getOneSite60001BrowserUploadPlan() {
  const reconciliation = await getRunnerReconciliation(ONESITE_60001.requestId, "onesite");
  if (!reconciliation || reconciliation.request.requestedReportName !== ONESITE_60001.reportName || reconciliation.request.requestedFormat !== "excel" || reconciliation.request.providerSelectedPropertyCount !== 35) {
    throw new Error("The stored Request #60001 authorization no longer matches the approved OneSite All Units batch.");
  }
  return getOneSite60001FilingPlan(reconciliation.documents);
}

export async function fileOneSite60001BrowserWorkbook(input: { propertyName: string; originalFilename: string; dataBase64: string }) {
  const plan = await getOneSite60001BrowserUploadPlan();
  const pendingPropertyNames = new Set<string>(plan.pendingFiling);
  const filedPropertyNames = new Set<string>(plan.alreadyFiled);
  if (!pendingPropertyNames.has(input.propertyName)) {
    if (filedPropertyNames.has(input.propertyName)) return { propertyName: input.propertyName, status: "already_filed" as const };
    throw new Error(`${input.propertyName} is not an eligible completed-but-unfiled Request #60001 property. In-progress and errored provider rows are excluded.`);
  }
  const property = await getPropertyByName(input.propertyName, "onesite");
  if (!property) throw new Error("The selected OneSite property is not present in the source-isolated directory.");
  const filename = safeFilename(input.originalFilename);
  const workbookBytes = decodeBase64(input.dataBase64);
  const filingDate = new Date().toISOString().slice(0, 10);
  const propertyFolder = safeFolderName(property.name);
  const original = await storagePut(`OneSite-Reporting/${propertyFolder}/${filingDate}/${ONESITE_60001.requestId}-${nanoid(10)}-${filename}`, workbookBytes, contentType(filename));
  let html: string;
  try {
    const contacts = await getManagerContactMatch(property.name);
    html = renderWorkbookDataHtml({
      source: "onesite",
      requestId: ONESITE_60001.requestId,
      reportName: ONESITE_60001.reportName,
      propertyNames: [property.name],
      originalFilename: filename,
      originalFileUrl: original.url,
      workbookBytes,
      contactMatches: [{ propertyName: property.name, ...contacts }],
    });
  } catch {
    throw new Error("The uploaded file could not be parsed as a readable Excel workbook. The original was not added to this request.");
  }
  if (Buffer.byteLength(html) > 5 * 1024 * 1024) throw new Error("The generated HTML companion exceeds the 5 MB safety limit. The original was not added to this request.");
  const htmlFilename = filename.replace(/\.xls[x]?$/i, ".html");
  const htmlDocument = await storagePut(`OneSite-Reporting/${propertyFolder}/${filingDate}/${ONESITE_60001.requestId}-${nanoid(10)}-${htmlFilename}`, html, "text/html");
  await createReportDocumentPair({
    requestId: ONESITE_60001.requestId,
    source: "onesite",
    propertyId: property.id,
    propertyName: property.name,
    original: { originalFilename: filename, mimeType: contentType(filename), storageKey: original.key, storageUrl: original.url, sizeBytes: workbookBytes.length },
    html: { originalFilename: htmlFilename, mimeType: "text/html", storageKey: htmlDocument.key, storageUrl: htmlDocument.url, sizeBytes: Buffer.byteLength(html) },
  });
  return { propertyName: property.name, status: "filed" as const };
}
