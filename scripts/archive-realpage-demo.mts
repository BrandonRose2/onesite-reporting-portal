import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { properties, reportingPeriods, sourceFiles } from "../drizzle/schema";
import { getDb } from "../server/db";
import { storagePut } from "../server/storage";

const SOURCE_PATH = "/home/ubuntu/delinquency-realpage-demo/anaheim-gardens-delinquent-prepaid.csv";
const PROPERTY_EXTERNAL_ID = "1181003";
const PERIOD_NAME = "Fiscal Period 04/2026 · 08/05/2026";
const ORIGINAL_FILENAME = "delinquentprepaidview- (4).csv";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");

  const [property] = await db.select().from(properties).where(eq(properties.externalId, PROPERTY_EXTERNAL_ID)).limit(1);
  const [period] = await db.select().from(reportingPeriods).where(eq(reportingPeriods.name, PERIOD_NAME)).limit(1);
  if (!property || !period) throw new Error("The Anaheim Gardens property or the initial reporting period was not found.");

  const existing = await db.select({ id: sourceFiles.id }).from(sourceFiles).where(and(
    eq(sourceFiles.reportingPeriodId, period.id),
    eq(sourceFiles.propertyId, property.id),
    eq(sourceFiles.originalFilename, ORIGINAL_FILENAME),
  )).limit(1);
  if (existing.length) throw new Error("This RealPage export is already archived for Anaheim Gardens in the initial reporting period.");

  const bytes = await readFile(SOURCE_PATH);
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const parsedRowCount = Math.max(0, bytes.toString("utf8").split(/\r?\n/).filter(Boolean).length - 1);
  const { key, url } = await storagePut(
    `delinquency/${period.id}/${property.externalId}/realpage/${ORIGINAL_FILENAME}`,
    bytes,
    "text/csv",
  );

  await db.insert(sourceFiles).values({
    reportingPeriodId: period.id,
    propertyId: property.id,
    originalFilename: ORIGINAL_FILENAME,
    storageKey: key,
    storageUrl: url,
    checksumSha256,
    mimeType: "text/csv",
    parsedRowCount,
    isSelectedExport: false,
  });

  console.log(JSON.stringify({ archived: true, periodId: period.id, propertyId: property.id, key, url, parsedRowCount, checksumSha256 }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
