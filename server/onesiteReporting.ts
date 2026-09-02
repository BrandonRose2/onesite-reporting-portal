import { and, asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import { properties, propertyContacts, reportCatalog, reportDocuments, reportRequests, runnerConnectionStatuses, users } from "../drizzle/schema";
import { getDb } from "./db";
import { storageGet } from "./storage";

export type ReportFormat = "excel" | "pdf" | "csv";
export type GenerateScheduleSettings = {
  mode: "generate_now" | "schedule_later";
  scheduledFor?: string;
  externalEmails: string[];
  notifyUserIds: number[];
  cloudService?: string;
  reportParameters: Record<string, string | boolean>;
};

export const DEFAULT_GENERATE_SETTINGS: GenerateScheduleSettings = {
  mode: "generate_now",
  externalEmails: [],
  notifyUserIds: [],
  reportParameters: {},
};

const CONTACT_AUTOFILL_EXCLUDED_EXTERNAL_IDS = ["5083727", "5159418"];

function normalizedSettings(settings?: Partial<GenerateScheduleSettings>): GenerateScheduleSettings {
  const mode = settings?.mode === "schedule_later" ? "schedule_later" : "generate_now";
  const scheduledFor = mode === "schedule_later" && settings?.scheduledFor ? settings.scheduledFor : undefined;
  return {
    mode,
    ...(scheduledFor ? { scheduledFor } : {}),
    externalEmails: Array.from(new Set((settings?.externalEmails ?? []).map(value => value.trim().toLowerCase()).filter(Boolean))).slice(0, 20),
    notifyUserIds: Array.from(new Set((settings?.notifyUserIds ?? []).filter(Number.isInteger))).slice(0, 50),
    ...(settings?.cloudService?.trim() ? { cloudService: settings.cloudService.trim().slice(0, 160) } : {}),
    reportParameters: Object.fromEntries(Object.entries(settings?.reportParameters ?? {}).filter(([key, value]) => key.trim() && (typeof value === "boolean" || String(value).trim())).map(([key, value]) => [key.trim().slice(0, 120), typeof value === "boolean" ? value : String(value).trim().slice(0, 500)])),
  };
}

async function requireCatalogEntry(catalogId: number) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const [catalogEntry] = await db.select().from(reportCatalog)
    .where(and(eq(reportCatalog.id, catalogId), eq(reportCatalog.sourceSystem, "realpage"), eq(reportCatalog.isActive, true)));
  if (!catalogEntry) throw new Error("That OneSite report is not available in the active catalog.");
  return { db, catalogEntry };
}

export async function listOneSiteReportCatalog() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(reportCatalog)
    .where(and(eq(reportCatalog.sourceSystem, "realpage"), eq(reportCatalog.isActive, true), eq(reportCatalog.isApproved, true)))
    .orderBy(desc(reportCatalog.isVerified), asc(reportCatalog.displayName));
  const canonical = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    const isLiveRow = row.slug.startsWith("realpage-");
    const isManualRow = row.slug.startsWith("manual-");
    if (!isLiveRow && !isManualRow) continue;
    const identity = isLiveRow ? [row.exactReportName, row.reportArea ?? "", row.reportLevel ?? "", row.product ?? ""].join("\u0000") : `manual:${row.id}`;
    const existing = canonical.get(identity);
    if (!existing || (row.isVerified && !existing.isVerified)) canonical.set(identity, row);
  }
  return Array.from(canonical.values())
    .map(row => ({ ...row, displayName: /delinquent\s+and\s+prepaid/i.test(row.displayName) ? "Delinquency" : row.displayName }))
    .sort((left, right) => Number(right.isVerified) - Number(left.isVerified) || left.displayName.localeCompare(right.displayName));
}

export async function listOneSiteReportCatalogAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reportCatalog)
    .where(eq(reportCatalog.sourceSystem, "realpage"))
    .orderBy(desc(reportCatalog.isActive), desc(reportCatalog.isApproved), desc(reportCatalog.isVerified), asc(reportCatalog.displayName));
}

type EditableCatalogEntry = {
  id?: number;
  displayName: string;
  exactReportName: string;
  defaultFormat: ReportFormat;
  reportArea?: string | null;
  reportLevel?: string | null;
  product?: string | null;
  description?: string | null;
  settingsSchemaJson?: string | null;
  isVerified: boolean;
  isApproved: boolean;
  isActive: boolean;
};

function catalogText(value?: string | null, max = 255) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function catalogSlug(title: string, area?: string | null) {
  const base = `${title}-${area ?? "report"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "onesite-report";
  return `manual-${base}-${Date.now().toString(36)}`.slice(0, 120);
}

export async function saveOneSiteReportCatalogEntry(input: EditableCatalogEntry) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const displayName = input.displayName.trim().slice(0, 255);
  const exactReportName = input.exactReportName.trim().slice(0, 255);
  const reportArea = catalogText(input.reportArea, 160);
  const reportLevel = catalogText(input.reportLevel, 80);
  const product = catalogText(input.product, 160);
  const description = catalogText(input.description, 10_000);
  const settingsSchemaJson = catalogText(input.settingsSchemaJson, 60_000);
  const values = {
    displayName,
    exactReportName,
    searchTerm: [displayName, exactReportName, reportArea, product].filter(Boolean).join(" ").slice(0, 160),
    defaultFormat: input.defaultFormat,
    reportArea,
    reportLevel,
    product,
    description,
    settingsSchemaJson,
    isVerified: input.isVerified,
    isApproved: input.isApproved,
    isActive: input.isActive,
  };
  if (input.id) {
    const [existing] = await db.select({ id: reportCatalog.id }).from(reportCatalog)
      .where(and(eq(reportCatalog.id, input.id), eq(reportCatalog.sourceSystem, "realpage"))).limit(1);
    if (!existing) throw new Error("That report catalog entry no longer exists.");
    await db.update(reportCatalog).set(values).where(eq(reportCatalog.id, existing.id));
    return { id: existing.id, created: false };
  }
  const inserted = await db.insert(reportCatalog).values({ sourceSystem: "realpage", slug: catalogSlug(displayName, reportArea), ...values });
  return { id: Number(inserted[0].insertId), created: true };
}

export async function listOneSiteReportRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ request: reportRequests, catalog: reportCatalog })
    .from(reportRequests)
    .leftJoin(reportCatalog, eq(reportRequests.reportCatalogId, reportCatalog.id))
    .where(eq(reportRequests.sourceSystem, "realpage"))
    .orderBy(desc(reportRequests.requestedAt))
    .limit(100);
}

export async function listOneSiteReportDocuments(propertyIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  const propertyScope = propertyIds ? Array.from(new Set(propertyIds.filter(id => Number.isInteger(id) && id > 0))) : null;
  if (propertyScope?.length === 0) return [];
  return db.select({
    id: reportDocuments.id,
    reportRequestId: reportDocuments.reportRequestId,
    reportCatalogId: reportRequests.reportCatalogId,
    catalogExactReportName: reportCatalog.exactReportName,
    catalogReportArea: reportCatalog.reportArea,
    catalogReportLevel: reportCatalog.reportLevel,
    catalogProduct: reportCatalog.product,
    documentKind: reportDocuments.documentKind,
    originalFilename: reportDocuments.originalFilename,
    storageUrl: reportDocuments.storageUrl,
    mimeType: reportDocuments.mimeType,
    fileSizeBytes: reportDocuments.fileSizeBytes,
    createdAt: reportDocuments.createdAt,
    propertyId: properties.id,
    propertyName: properties.name,
    region: properties.region,
    requestStatus: reportRequests.status,
    requestedReportName: reportRequests.requestedReportName,
  }).from(reportDocuments)
    .innerJoin(reportRequests, eq(reportDocuments.reportRequestId, reportRequests.id))
    .leftJoin(reportCatalog, eq(reportRequests.reportCatalogId, reportCatalog.id))
    .leftJoin(properties, eq(reportDocuments.propertyId, properties.id))
    .where(propertyScope
      ? and(eq(reportRequests.sourceSystem, "realpage"), inArray(reportDocuments.propertyId, propertyScope))
      : eq(reportRequests.sourceSystem, "realpage"))
    .orderBy(desc(reportDocuments.createdAt), asc(properties.name))
    .limit(500);
}

export async function getOneSiteReportDocumentUrl(input: { documentId: number }, propertyIds?: number[]) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const propertyScope = propertyIds ? Array.from(new Set(propertyIds.filter(id => Number.isInteger(id) && id > 0))) : null;
  if (propertyScope?.length === 0) throw new Error("You are not assigned to this workbook.");
  const [document] = await db.select({
    id: reportDocuments.id,
    storageKey: reportDocuments.storageKey,
    originalFilename: reportDocuments.originalFilename,
    propertyId: reportDocuments.propertyId,
  }).from(reportDocuments)
    .innerJoin(reportRequests, eq(reportDocuments.reportRequestId, reportRequests.id))
    .where(propertyScope
      ? and(eq(reportDocuments.id, input.documentId), eq(reportRequests.sourceSystem, "realpage"), inArray(reportDocuments.propertyId, propertyScope))
      : and(eq(reportDocuments.id, input.documentId), eq(reportRequests.sourceSystem, "realpage")))
    .limit(1);
  if (!document) throw new Error("That workbook is unavailable or you do not have access to it.");
  const { url } = await storageGet(document.storageKey);
  return { url, originalFilename: document.originalFilename };
}

export async function listOneSiteInternalNotificationUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(asc(users.name));
}

export async function getLiveEdgeRunnerStatus(runnerKey: string = "macos-live-edge") {
  const db = await getDb();
  if (!db) return null;
  const [status] = await db.select().from(runnerConnectionStatuses)
    .where(eq(runnerConnectionStatuses.runnerKey, runnerKey))
    .limit(1);
  return status ?? null;
}

export async function listOneSitePropertyContacts(propertyIds?: number[]) {
  const db = await getDb();
  if (!db) return [];
  const propertyScope = propertyIds ? Array.from(new Set(propertyIds.filter(id => Number.isInteger(id) && id > 0))) : null;
  if (propertyScope?.length === 0) return [];
  return db.select({
    propertyId: properties.id,
    propertyName: properties.name,
    region: properties.region,
    managerName: propertyContacts.managerName,
    managerEmail: propertyContacts.managerEmail,
    mobilePhone: propertyContacts.mobilePhone,
    officePhone: propertyContacts.officePhone,
    extension: propertyContacts.extension,
    mappingStatus: propertyContacts.mappingStatus,
    sourceSyncedAt: propertyContacts.sourceSyncedAt,
  }).from(properties)
    .leftJoin(propertyContacts, eq(propertyContacts.propertyId, properties.id))
    .where(propertyScope
      ? and(eq(properties.isActive, true), notInArray(properties.externalId, CONTACT_AUTOFILL_EXCLUDED_EXTERNAL_IDS), inArray(properties.id, propertyScope))
      : and(eq(properties.isActive, true), notInArray(properties.externalId, CONTACT_AUTOFILL_EXCLUDED_EXTERNAL_IDS)))
    .orderBy(asc(properties.name));
}

export async function queueCatalogReportRequest(input: { catalogId: number; requestedByUserId: number; format?: ReportFormat; settings?: Partial<GenerateScheduleSettings> }) {
  const { db, catalogEntry } = await requireCatalogEntry(input.catalogId);
  const settings = normalizedSettings(input.settings);
  const notificationRecipients = settings.notifyUserIds.length
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, settings.notifyUserIds))
    : [];
  const inserted = await db.insert(reportRequests).values({
    sourceSystem: "realpage",
    requestType: "generate_all_properties",
    status: "queued",
    reportCatalogId: catalogEntry.id,
    requestedReportName: catalogEntry.exactReportName,
    requestedFormat: input.format ?? catalogEntry.defaultFormat,
    propertyScope: "all_properties",
    requestedByUserId: input.requestedByUserId,
    parameterJson: JSON.stringify({ searchTerm: catalogEntry.searchTerm, exactReportName: catalogEntry.exactReportName, reportArea: catalogEntry.reportArea, reportLevel: catalogEntry.reportLevel, product: catalogEntry.product, format: input.format ?? catalogEntry.defaultFormat, propertyScope: "all_properties", generationSettings: settings, notificationRecipients }),
  });
  return { id: Number(inserted[0].insertId), reportName: catalogEntry.displayName, format: input.format ?? catalogEntry.defaultFormat, settings };
}

export async function queueCatalogPropertyReportRequest(input: { catalogId: number; propertyId: number; requestedByUserId: number; format?: ReportFormat; settings?: Partial<GenerateScheduleSettings> }) {
  const { db, catalogEntry } = await requireCatalogEntry(input.catalogId);
  const [property] = await db.select({ id: properties.id, name: properties.name, externalId: properties.externalId }).from(properties)
    .where(and(eq(properties.id, input.propertyId), eq(properties.isActive, true))).limit(1);
  if (!property) throw new Error("Choose an active portfolio property before queueing a property-specific report.");
  const settings = normalizedSettings(input.settings);
  const notificationRecipients = settings.notifyUserIds.length
    ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, settings.notifyUserIds))
    : [];
  const format = input.format ?? catalogEntry.defaultFormat;
  const inserted = await db.insert(reportRequests).values({
    sourceSystem: "realpage",
    requestType: "generate_property",
    status: "queued",
    reportCatalogId: catalogEntry.id,
    requestedReportName: catalogEntry.exactReportName,
    requestedFormat: format,
    propertyScope: `property:${property.id}`,
    requestedByUserId: input.requestedByUserId,
    parameterJson: JSON.stringify({ searchTerm: catalogEntry.searchTerm, exactReportName: catalogEntry.exactReportName, reportArea: catalogEntry.reportArea, reportLevel: catalogEntry.reportLevel, product: catalogEntry.product, format, propertyScope: "specific_property", propertyId: property.id, propertyName: property.name, propertyExternalId: property.externalId, generationSettings: settings, notificationRecipients }),
  });
  return { id: Number(inserted[0].insertId), reportName: catalogEntry.displayName, propertyName: property.name, format, settings };
}

export async function queueCustomReportRequest(input: { exactReportName: string; format: ReportFormat; requestedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const exactReportName = input.exactReportName.trim();
  if (!exactReportName) throw new Error("Enter the exact OneSite report title.");
  const inserted = await db.insert(reportRequests).values({
    sourceSystem: "realpage",
    requestType: "generate_all_properties",
    status: "queued",
    requestedReportName: exactReportName,
    requestedFormat: input.format,
    propertyScope: "all_properties",
    requestedByUserId: input.requestedByUserId,
    parameterJson: JSON.stringify({ searchTerm: exactReportName, exactReportName, format: input.format, propertyScope: "all_properties", catalogStatus: "custom_pending_discovery" }),
  });
  return { id: Number(inserted[0].insertId), reportName: exactReportName, format: input.format };
}

export async function queueMyReportsSynchronization(input: { requestedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const inserted = await db.insert(reportRequests).values({
    sourceSystem: "realpage",
    requestType: "sync_my_reports",
    status: "queued",
    requestedReportName: "My Reports synchronization",
    requestedFormat: "pdf",
    propertyScope: "all_properties",
    requestedByUserId: input.requestedByUserId,
    parameterJson: JSON.stringify({ source: "onesite_my_reports", propertyScope: "all_properties" }),
  });
  return { id: Number(inserted[0].insertId) };
}
