import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { properties, propertyContacts, reportCatalog, reportRequests, runnerConnectionStatuses, users } from "../drizzle/schema";
import { getDb } from "./db";

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
  return db.select().from(reportCatalog)
    .where(and(eq(reportCatalog.sourceSystem, "realpage"), eq(reportCatalog.isActive, true), eq(reportCatalog.isApproved, true)))
    .orderBy(desc(reportCatalog.isVerified), asc(reportCatalog.displayName));
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

export async function listOneSiteInternalNotificationUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(asc(users.name));
}

export async function getLiveEdgeRunnerStatus() {
  const db = await getDb();
  if (!db) return null;
  const [status] = await db.select().from(runnerConnectionStatuses)
    .where(eq(runnerConnectionStatuses.runnerKey, "macos-live-edge"))
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
    .where(propertyScope ? and(eq(properties.isActive, true), inArray(properties.id, propertyScope)) : eq(properties.isActive, true))
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
