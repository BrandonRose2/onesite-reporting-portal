import { and, desc, eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import {
  properties,
  propertyPeriodSummaries,
  reportingPeriods,
  residentLedgerRows,
  sourceFiles,
} from "../drizzle/schema";
import type { DelinquencyMetrics, RegionName } from "../shared/delinquency";
import { emptyMetrics } from "../shared/delinquency";
import { getDb } from "./db";
import { storagePut } from "./storage";

type RawRow = Record<string, unknown>;

export type ImportFileInput = {
  filename: string;
  dataBase64: string;
};

export type ParsedLedgerRow = {
  residentKey: string;
  reshId: string | null;
  leaseId: string | null;
  unit: string | null;
  residentName: string | null;
  phoneNumber: string | null;
  email: string | null;
  residentStatus: string | null;
  moveInOut: string | null;
  transactionCode: string | null;
  codeDescription: string | null;
  totalPrepaid: number;
  totalDelinquent: number;
  netBalance: number;
  currentAmount: number;
  days30Amount: number;
  days60Amount: number;
  days90PlusAmount: number;
  depositsCreditsHeld: number;
  lateCount: number;
  nsfCount: number;
  collectionNotes: string | null;
};

export type PropertyDashboardRow = {
  id: number;
  externalId: string;
  name: string;
  region: RegionName;
  residentCount: number;
  delinquentUnits: number;
  netPrepaid: number;
  netDelinquent: number;
  netBalance: number;
  currentAmount: number;
  days30Amount: number;
  days60Amount: number;
  days90PlusAmount: number;
  sourceFilename: string | null;
};

const REGION_BY_PROPERTY_ID: Record<string, RegionName> = {
  "4304099": "Region 1",
  "1482145": "Region 1",
  "4859069": "Region 1",
  "2312055": "Region 1",
  "2432257": "Region 1",
  "4160082": "Region 1",
  "4573141": "Region 1",
  "3927824": "Region 2",
  "5661023": "Region 2",
  "3156041": "Region 2",
  "3835626": "Region 2",
  "4679872": "Region 2",
  "3073874": "Region 2",
  "3927823": "Region 2",
  "5414947": "Region 2",
  "5204960": "Region 3",
  "5313974": "Region 3",
  "4276597": "Region 3",
  "4992471": "Region 3",
  "5313976": "Region 3",
  "5313977": "Region 3",
  "4371422": "Region 3",
  "4233753": "Region 3",
  "4233754": "Region 3",
  "1181003": "Region 4",
  "1181004": "Region 4",
  "1181005": "Region 4",
  "1181006": "Region 4",
  "2934332": "Region 4",
  "3990059": "Region 4",
  "3990061": "Region 4",
  "5083727": "Region 4",
  "5159418": "Region 4",
  "2836023": "Region 4",
  "4022593": "Region 4",
};

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function text(value: unknown) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned : null;
}

function amount(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").replace(/[$,\s]/g, "");
  if (!raw) return 0;
  const isNegative = raw.includes("(") && raw.includes(")");
  const parsed = Number.parseFloat(raw.replace(/[()]/g, ""));
  return Number.isFinite(parsed) ? (isNegative ? -parsed : parsed) : 0;
}

function integer(value: unknown) {
  const parsed = Number.parseInt(String(value ?? "").replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getValue(row: RawRow, aliases: string[]) {
  const normalizedAliases = aliases.map(normalize);
  const entry = Object.entries(row).find(([key]) => {
    const normalizedKey = normalize(key);
    return normalizedAliases.some(alias => normalizedKey === alias || normalizedKey.includes(alias));
  });
  return entry?.[1] ?? "";
}

function metricsFor(rows: ParsedLedgerRow[]): DelinquencyMetrics {
  const metrics = emptyMetrics();
  const residentKeys = new Set<string>();
  const delinquentUnits = new Set<string>();

  rows.forEach(row => {
    residentKeys.add(row.residentKey);
    if (row.netBalance > 0 && row.unit) delinquentUnits.add(row.unit);
    metrics.netPrepaid += row.totalPrepaid;
    metrics.netDelinquent += row.totalDelinquent;
    metrics.netBalance += row.netBalance;
    metrics.currentAmount += row.currentAmount;
    metrics.days30Amount += row.days30Amount;
    metrics.days60Amount += row.days60Amount;
    metrics.days90PlusAmount += row.days90PlusAmount;
  });

  metrics.residentCount = residentKeys.size;
  metrics.delinquentUnits = delinquentUnits.size;
  return metrics;
}

function rowObjectsFromWorksheet(sheet: XLSX.WorkSheet): RawRow[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerIndex = matrix.findIndex(row => {
    const values = row.map(value => normalize(value));
    return values.includes("bldgunit") && values.includes("name") && values.includes("netbalance");
  });
  if (headerIndex < 0) return [];
  const headers = matrix[headerIndex].map(value => String(value).trim());
  return matrix.slice(headerIndex + 1).map(values => Object.fromEntries(headers.map((header, index) => [header || `column${index}`, values[index] ?? ""])));
}

function candidateSheets(workbook: XLSX.WorkBook) {
  return workbook.SheetNames
    .map(name => ({ name, rows: rowObjectsFromWorksheet(workbook.Sheets[name]) }))
    .filter(candidate => candidate.rows.length)
    .sort((left, right) => {
      const leftHasCode = Object.keys(left.rows[0] ?? {}).some(key => normalize(key) === "codedescription");
      const rightHasCode = Object.keys(right.rows[0] ?? {}).some(key => normalize(key) === "codedescription");
      return Number(rightHasCode) - Number(leftHasCode);
    });
}

export function parseDelinquencyWorkbook(buffer: Buffer): ParsedLedgerRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheets = candidateSheets(workbook);
  const targetSheets = sheets.length ? [sheets[0]] : [];
  const parsed: ParsedLedgerRow[] = [];

  targetSheets.forEach(({ rows }) => {
    rows.forEach(row => {
      const unit = text(getValue(row, ["Bldg/Unit", "Unit"]));
      const residentName = text(getValue(row, ["Name", "Resident Name"]));
      const reshId = text(getValue(row, ["Resh ID", "Resident ID"]));
      const leaseId = text(getValue(row, ["Lease ID"]));
      if (!unit || !residentName || /grand totals|subtotal|summary/i.test(residentName)) return;

      const residentKey = reshId || leaseId || `${unit}-${residentName}`;
      parsed.push({
        residentKey,
        reshId,
        leaseId,
        unit,
        residentName,
        phoneNumber: text(getValue(row, ["Phone Number", "Phone"])),
        email: text(getValue(row, ["Email"])),
        residentStatus: text(getValue(row, ["Status"])),
        moveInOut: text(getValue(row, ["Move-In/Out", "Move In Out"])),
        transactionCode: text(getValue(row, ["Code"])),
        codeDescription: text(getValue(row, ["Description"])),
        totalPrepaid: amount(getValue(row, ["Total Prepaid", "Prepaid"])),
        totalDelinquent: amount(getValue(row, ["Total Delinquent", "Delinquent"])),
        netBalance: amount(getValue(row, ["Net Balance", "Balance"])),
        currentAmount: amount(getValue(row, ["Current"])),
        days30Amount: amount(getValue(row, ["30 Days", "30 Day"])),
        days60Amount: amount(getValue(row, ["60 Days", "60 Day"])),
        days90PlusAmount: amount(getValue(row, ["90+", "90 Days", "90 Day"])),
        depositsCreditsHeld: amount(getValue(row, ["Deposits Credits Held", "Credits Held"])),
        lateCount: integer(getValue(row, ["# Late", "Late Count"])),
        nsfCount: integer(getValue(row, ["# NSF", "NSF Count"])),
        collectionNotes: text(getValue(row, ["DEL Comment", "Collection Notes", "Comment"])),
      });
    });
  });

  return parsed;
}

function getPropertyDescriptor(filename: string) {
  const match = filename.match(/^(\d+)_([^_]+?)_Delinquent and Prepaid/i);
  if (!match) throw new Error(`Unable to identify a property ID and entity name from ${filename}.`);
  const [, externalId, name] = match;
  return { externalId, name: name.replace(/_/g, " ").trim(), region: REGION_BY_PROPERTY_ID[externalId] ?? "Region 4" };
}

function dateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("The reporting as-of date must use YYYY-MM-DD format.");
  return value;
}

export async function importDelinquencyBatch(input: {
  name: string;
  fiscalPeriod: string;
  asOfDate: string;
  files: ImportFileInput[];
  importedByUserId: number;
}) {
  if (!input.files.length || input.files.length > 35) throw new Error("Import one to 35 Delinquent and Prepaid XLS files per reporting period.");
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable. Please try again.");
  const existing = await db.select({ id: reportingPeriods.id }).from(reportingPeriods).where(eq(reportingPeriods.name, input.name)).limit(1);
  if (existing.length) throw new Error("A reporting period with this name already exists.");

  const periodInsert = await db.insert(reportingPeriods).values({
    name: input.name,
    fiscalPeriod: input.fiscalPeriod,
    asOfDate: new Date(`${dateString(input.asOfDate)}T12:00:00.000Z`),
    importedByUserId: input.importedByUserId,
    status: "draft",
  });
  const reportingPeriodId = Number(periodInsert[0].insertId);

  try {
    for (const file of input.files) {
      if (!/\.xls(x)?$/i.test(file.filename) || !/delinquent and prepaid/i.test(file.filename)) {
        throw new Error(`${file.filename} is not a Delinquent and Prepaid XLS export.`);
      }
      const descriptor = getPropertyDescriptor(file.filename);
      const binary = Buffer.from(file.dataBase64, "base64");
      if (!binary.length) throw new Error(`${file.filename} is empty.`);
      const rows = parseDelinquencyWorkbook(binary);

      await db.insert(properties).values({
        externalId: descriptor.externalId,
        name: descriptor.name,
        region: descriptor.region,
        isActive: true,
      }).onDuplicateKeyUpdate({ set: { name: descriptor.name, region: descriptor.region, isActive: true } });
      const property = await db.select().from(properties).where(eq(properties.externalId, descriptor.externalId)).limit(1);
      const propertyId = property[0]?.id;
      if (!propertyId) throw new Error(`Unable to save property ${descriptor.externalId}.`);

      const checksumSha256 = createHash("sha256").update(binary).digest("hex");
      const stored = await storagePut(
        `delinquency-reports/${reportingPeriodId}/${descriptor.externalId}/${file.filename}`,
        binary,
        "application/vnd.ms-excel",
      );
      const sourceFileInsert = await db.insert(sourceFiles).values({
        reportingPeriodId,
        propertyId,
        originalFilename: file.filename,
        storageKey: stored.key,
        storageUrl: stored.url,
        checksumSha256,
        mimeType: "application/vnd.ms-excel",
        parsedRowCount: rows.length,
        isSelectedExport: /- Excel_/i.test(file.filename),
      });
      const sourceFileId = Number(sourceFileInsert[0].insertId);

      if (rows.length) {
        await db.insert(residentLedgerRows).values(rows.map(row => ({
          reportingPeriodId,
          propertyId,
          sourceFileId,
          ...row,
          totalPrepaid: row.totalPrepaid.toFixed(2),
          totalDelinquent: row.totalDelinquent.toFixed(2),
          netBalance: row.netBalance.toFixed(2),
          currentAmount: row.currentAmount.toFixed(2),
          days30Amount: row.days30Amount.toFixed(2),
          days60Amount: row.days60Amount.toFixed(2),
          days90PlusAmount: row.days90PlusAmount.toFixed(2),
          depositsCreditsHeld: row.depositsCreditsHeld.toFixed(2),
        })));
      }

      const metrics = metricsFor(rows);
      await db.insert(propertyPeriodSummaries).values({
        reportingPeriodId,
        propertyId,
        sourceFileId,
        residentCount: metrics.residentCount,
        delinquentUnits: metrics.delinquentUnits,
        netPrepaid: metrics.netPrepaid.toFixed(2),
        netDelinquent: metrics.netDelinquent.toFixed(2),
        netBalance: metrics.netBalance.toFixed(2),
        currentAmount: metrics.currentAmount.toFixed(2),
        days30Amount: metrics.days30Amount.toFixed(2),
        days60Amount: metrics.days60Amount.toFixed(2),
        days90PlusAmount: metrics.days90PlusAmount.toFixed(2),
      });
    }

    await db.update(reportingPeriods).set({ status: "ready", sourceFileCount: input.files.length, importedAt: new Date() }).where(eq(reportingPeriods.id, reportingPeriodId));
    return { reportingPeriodId, sourceFileCount: input.files.length };
  } catch (error) {
    await db.update(reportingPeriods).set({ status: "failed", notes: error instanceof Error ? error.message : "Import failed" }).where(eq(reportingPeriods.id, reportingPeriodId));
    throw error;
  }
}

function asNumber(value: unknown) {
  return Number(value ?? 0);
}

function addToMetrics(metrics: DelinquencyMetrics, row: Record<string, unknown>) {
  metrics.residentCount += asNumber(row.residentCount);
  metrics.delinquentUnits += asNumber(row.delinquentUnits);
  metrics.netPrepaid += asNumber(row.netPrepaid);
  metrics.netDelinquent += asNumber(row.netDelinquent);
  metrics.netBalance += asNumber(row.netBalance);
  metrics.currentAmount += asNumber(row.currentAmount);
  metrics.days30Amount += asNumber(row.days30Amount);
  metrics.days60Amount += asNumber(row.days60Amount);
  metrics.days90PlusAmount += asNumber(row.days90PlusAmount);
}

export async function listReportingPeriods() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reportingPeriods).where(eq(reportingPeriods.status, "ready")).orderBy(desc(reportingPeriods.asOfDate));
}

export async function getDashboard(reportingPeriodId?: number, propertyIds?: number[]) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const periods = await listReportingPeriods();
  const period = reportingPeriodId ? periods.find(item => item.id === reportingPeriodId) : periods.find(item => item.status === "ready");
  if (!period) return { period: null, metrics: emptyMetrics(), regions: [] as Array<{ region: string; metrics: DelinquencyMetrics; properties: PropertyDashboardRow[] }> };

  const propertyScope = propertyIds ? Array.from(new Set(propertyIds.filter(id => Number.isInteger(id) && id > 0))) : null;
  const rows = propertyScope?.length === 0 ? [] : await db.select({
    property: properties,
    summary: propertyPeriodSummaries,
    sourceFile: sourceFiles,
  }).from(propertyPeriodSummaries)
    .innerJoin(properties, eq(propertyPeriodSummaries.propertyId, properties.id))
    .leftJoin(sourceFiles, eq(propertyPeriodSummaries.sourceFileId, sourceFiles.id))
    .where(propertyScope ? and(eq(propertyPeriodSummaries.reportingPeriodId, period.id), inArray(propertyPeriodSummaries.propertyId, propertyScope)) : eq(propertyPeriodSummaries.reportingPeriodId, period.id));

  const metrics = emptyMetrics();
  const byRegion = new Map<string, { region: string; metrics: DelinquencyMetrics; properties: PropertyDashboardRow[] }>();
  rows.forEach(row => {
    addToMetrics(metrics, row.summary);
    const region = row.property.region;
    const group = byRegion.get(region) ?? { region, metrics: emptyMetrics(), properties: [] };
    addToMetrics(group.metrics, row.summary);
    group.properties.push({
      id: row.property.id,
      externalId: row.property.externalId,
      name: row.property.name,
      region: row.property.region,
      residentCount: row.summary.residentCount,
      delinquentUnits: row.summary.delinquentUnits,
      netPrepaid: asNumber(row.summary.netPrepaid),
      netDelinquent: asNumber(row.summary.netDelinquent),
      netBalance: asNumber(row.summary.netBalance),
      currentAmount: asNumber(row.summary.currentAmount),
      days30Amount: asNumber(row.summary.days30Amount),
      days60Amount: asNumber(row.summary.days60Amount),
      days90PlusAmount: asNumber(row.summary.days90PlusAmount),
      sourceFilename: row.sourceFile?.originalFilename ?? null,
    });
    byRegion.set(region, group);
  });

  return { period, metrics, regions: Array.from(byRegion.values()) };
}

export async function getPropertyDetail(input: { reportingPeriodId: number; propertyId: number }) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const [summary] = await db.select({ property: properties, summary: propertyPeriodSummaries, sourceFile: sourceFiles })
    .from(propertyPeriodSummaries)
    .innerJoin(properties, eq(propertyPeriodSummaries.propertyId, properties.id))
    .leftJoin(sourceFiles, eq(propertyPeriodSummaries.sourceFileId, sourceFiles.id))
    .where(and(eq(propertyPeriodSummaries.reportingPeriodId, input.reportingPeriodId), eq(propertyPeriodSummaries.propertyId, input.propertyId)));
  const rows = await db.select().from(residentLedgerRows)
    .where(and(eq(residentLedgerRows.reportingPeriodId, input.reportingPeriodId), eq(residentLedgerRows.propertyId, input.propertyId)))
    .orderBy(desc(residentLedgerRows.netBalance));
  const sourceDocuments = await db.select().from(sourceFiles)
    .where(and(eq(sourceFiles.reportingPeriodId, input.reportingPeriodId), eq(sourceFiles.propertyId, input.propertyId)))
    .orderBy(desc(sourceFiles.importedAt));
  return { summary: summary ?? null, rows, sourceDocuments };
}

export async function getSourceDocumentPreview(input: { sourceFileId: number }, propertyIds?: number[]) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");

  const [document] = await db.select({
    document: sourceFiles,
    property: properties,
    period: reportingPeriods,
  }).from(sourceFiles)
    .innerJoin(properties, eq(sourceFiles.propertyId, properties.id))
    .innerJoin(reportingPeriods, eq(sourceFiles.reportingPeriodId, reportingPeriods.id))
    .where(eq(sourceFiles.id, input.sourceFileId));

  if (!document) return null;
  const propertyScope = propertyIds ? Array.from(new Set(propertyIds.filter(id => Number.isInteger(id) && id > 0))) : null;
  if (propertyScope && !propertyScope.includes(document.document.propertyId)) {
    throw new Error("You are not assigned to this property.");
  }

  const rows = await db.select().from(residentLedgerRows)
    .where(eq(residentLedgerRows.sourceFileId, input.sourceFileId))
    .orderBy(residentLedgerRows.unit, residentLedgerRows.residentName);

  return { ...document, rows };
}

export async function compareReportingPeriods(input: { currentPeriodId: number; priorPeriodId: number }) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const [currentPeriod] = await db.select().from(reportingPeriods).where(eq(reportingPeriods.id, input.currentPeriodId));
  const [priorPeriod] = await db.select().from(reportingPeriods).where(eq(reportingPeriods.id, input.priorPeriodId));
  if (!currentPeriod || !priorPeriod) throw new Error("Choose two stored reporting periods to compare.");

  const getMetrics = async (reportingPeriodId: number) => {
    const rows = await db.select().from(propertyPeriodSummaries).where(eq(propertyPeriodSummaries.reportingPeriodId, reportingPeriodId));
    return rows.reduce((result, row) => {
      addToMetrics(result, row);
      return result;
    }, emptyMetrics());
  };
  const [current, prior] = await Promise.all([getMetrics(currentPeriod.id), getMetrics(priorPeriod.id)]);
  return {
    currentPeriod,
    priorPeriod,
    current,
    prior,
    change: {
      netBalance: current.netBalance - prior.netBalance,
      delinquentUnits: current.delinquentUnits - prior.delinquentUnits,
      delinquencyRate: (current.residentCount ? current.delinquentUnits / current.residentCount : 0) - (prior.residentCount ? prior.delinquentUnits / prior.residentCount : 0),
    },
  };
}

export async function getPeriodExportRows(reportingPeriodId: number) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const rows = await db.select({ property: properties, ledger: residentLedgerRows })
    .from(residentLedgerRows)
    .innerJoin(properties, eq(residentLedgerRows.propertyId, properties.id))
    .where(eq(residentLedgerRows.reportingPeriodId, reportingPeriodId))
    .orderBy(properties.region, properties.name, desc(residentLedgerRows.netBalance));
  return rows.map(row => ({
    propertyExternalId: row.property.externalId,
    property: row.property.name,
    region: row.property.region,
    ...row.ledger,
  }));
}
