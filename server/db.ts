import { and, asc, count, desc, eq, gte, inArray, like, notInArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  operationalConfig,
  managerContacts,
  properties,
  reportCatalog,
  reportDocuments,
  reportRequests,
  requestEvents,
  requestProperties,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { assertRequestTransition, type RequestStatus } from "./requestLifecycle";
import { renderReportSummaryHtml } from "./reportSummary";
import { buildManagerChecklist } from "./managerChecklist";
import { matchManagerContacts, normalizePropertyName, type ManagerContactInput } from "./contactMatching";

let dbClient: ReturnType<typeof drizzle> | null = null;
export type RunnerSource = "onesite" | "yardi";

export function setDbClientForTesting(client: ReturnType<typeof drizzle> | null) {
  dbClient = client;
}

export async function getDb() {
  if (!dbClient && process.env.DATABASE_URL) {
    dbClient = drizzle(process.env.DATABASE_URL);
  }
  return dbClient;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = { ...user, lastSignedIn: user.lastSignedIn ?? new Date() };
  if (!values.role && user.openId === ENV.ownerOpenId) values.role = "admin";
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name ?? null,
      email: values.email ?? null,
      loginMethod: values.loginMethod ?? null,
      role: values.role,
      lastSignedIn: new Date(),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listProperties(includeInactive = true) {
  const db = await requireDb();
  return db.select().from(properties).where(includeInactive ? undefined : eq(properties.active, true)).orderBy(asc(properties.name));
}

export async function getPropertyById(id: number) {
  const db = await requireDb();
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result[0];
}

export async function getPropertyByName(name: string) {
  const db = await requireDb();
  const result = await db.select().from(properties).where(eq(properties.name, name)).limit(1);
  return result[0];
}

export async function upsertProperty(input: { id?: number; externalId: string; name: string; market?: string | null; managerName?: string | null; managerEmail?: string | null; active: boolean }) {
  const db = await requireDb();
  if (input.id) {
    await db.update(properties).set({ ...input, id: undefined }).where(eq(properties.id, input.id));
    return getPropertyById(input.id);
  }
  const [result] = await db.insert(properties).values(input);
  return getPropertyById(result.insertId);
}

export async function listCatalog(includeInactive = false, source?: RunnerSource) {
  const db = await requireDb();
  const conditions = [];
  if (!includeInactive) conditions.push(eq(reportCatalog.active, true));
  if (source) conditions.push(eq(reportCatalog.source, source));
  return db.select().from(reportCatalog).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(reportCatalog.exactReportName));
}

export async function getCatalogEntryById(id: number) {
  const db = await requireDb();
  return (await db.select().from(reportCatalog).where(eq(reportCatalog.id, id)).limit(1))[0];
}

export async function upsertCatalogEntry(input: {
  id?: number;
  source: RunnerSource;
  catalogKey: string;
  exactReportName: string;
  reportArea?: string | null;
  reportLevel?: string | null;
  product?: string | null;
  availableFormats: Array<"excel" | "pdf" | "csv">;
  runnerMetadata: Record<string, unknown>;
  active: boolean;
}) {
  const db = await requireDb();
  if (input.id) {
    await db.update(reportCatalog).set({ ...input, id: undefined }).where(eq(reportCatalog.id, input.id));
    const rows = await db.select().from(reportCatalog).where(eq(reportCatalog.id, input.id)).limit(1);
    return rows[0];
  }
  await db.insert(reportCatalog).values(input).onDuplicateKeyUpdate({ set: { ...input, id: undefined } });
  const rows = await db.select().from(reportCatalog).where(and(eq(reportCatalog.source, input.source), eq(reportCatalog.catalogKey, input.catalogKey))).limit(1);
  return rows[0];
}

export async function createReportRequest(input: {
  source: RunnerSource;
  requestType: "generate_all_properties" | "generate_property" | "sync_my_reports";
  requestedReportName: string;
  requestedFormat: "excel" | "pdf" | "csv";
  parameters: Record<string, unknown>;
  requestedById: number;
  propertyId?: number;
}) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const selectedProperties = input.requestType === "generate_property"
      ? await tx.select().from(properties).where(and(eq(properties.id, input.propertyId ?? -1), eq(properties.active, true)))
      : input.requestType === "generate_all_properties"
        ? await tx.select().from(properties).where(eq(properties.active, true)).orderBy(asc(properties.name))
        : [];

    if (input.requestType !== "sync_my_reports" && selectedProperties.length === 0) {
      throw new Error("No active properties are available for this request.");
    }

    const [requestResult] = await tx.insert(reportRequests).values({
      source: input.source,
      requestType: input.requestType,
      requestedReportName: input.requestedReportName,
      requestedFormat: input.requestedFormat,
      parameters: input.parameters,
      requestedById: input.requestedById,
    });
    const requestId = requestResult.insertId;

    if (selectedProperties.length) {
      await tx.insert(requestProperties).values(selectedProperties.map(property => ({
        requestId,
        propertyId: property.id,
        propertyNameSnapshot: property.name,
      })));
    }

    await tx.insert(requestEvents).values({ requestId, eventType: "queued", detail: "Report request submitted from the internal portal." });
    return requestId;
  });
}

export async function listRecentRequests(limit = 25, source?: RunnerSource) {
  const db = await requireDb();
  return db.select().from(reportRequests).where(source ? eq(reportRequests.source, source) : undefined).orderBy(desc(reportRequests.createdAt)).limit(limit);
}

export async function listReportLibraryRequests(limit = 200, source?: RunnerSource) {
  const db = await requireDb();
  const requests = await listRecentRequests(limit, source);
  if (!requests.length) return [];
  const propertyRows = await db.select({ requestId: requestProperties.requestId, propertyName: requestProperties.propertyNameSnapshot })
    .from(requestProperties).where(inArray(requestProperties.requestId, requests.map(request => request.id))).orderBy(asc(requestProperties.propertyNameSnapshot));
  const propertyNamesByRequest = new Map<number, string[]>();
  propertyRows.forEach(row => propertyNamesByRequest.set(row.requestId, [...(propertyNamesByRequest.get(row.requestId) ?? []), row.propertyName]));
  return requests.map(request => ({ ...request, propertyNames: propertyNamesByRequest.get(request.id) ?? [] }));
}

export async function getRequestDetails(requestId: number) {
  const db = await requireDb();
  const request = (await db.select().from(reportRequests).where(eq(reportRequests.id, requestId)).limit(1))[0];
  if (!request) return undefined;
  const [requestPropertyRows, documentRows, eventRows] = await Promise.all([
    db.select({ id: properties.id, externalId: properties.externalId, name: requestProperties.propertyNameSnapshot, active: properties.active })
      .from(requestProperties).leftJoin(properties, eq(requestProperties.propertyId, properties.id)).where(eq(requestProperties.requestId, requestId)).orderBy(asc(requestProperties.propertyNameSnapshot)),
    db.select().from(reportDocuments).where(eq(reportDocuments.requestId, requestId)).orderBy(desc(reportDocuments.createdAt)),
    db.select().from(requestEvents).where(eq(requestEvents.requestId, requestId)).orderBy(desc(requestEvents.createdAt)),
  ]);
  return { request, properties: requestPropertyRows, documents: documentRows, events: eventRows };
}

export async function requestBelongsToSource(requestId: number, source: RunnerSource) {
  const db = await requireDb();
  const request = (await db.select({ id: reportRequests.id }).from(reportRequests).where(and(eq(reportRequests.id, requestId), eq(reportRequests.source, source))).limit(1))[0];
  return Boolean(request);
}

export async function getPropertyHistory(propertyId: number) {
  const db = await requireDb();
  const property = await getPropertyById(propertyId);
  if (!property) return undefined;
  const requests = await db.select({ request: reportRequests, propertyName: requestProperties.propertyNameSnapshot })
    .from(requestProperties).innerJoin(reportRequests, eq(requestProperties.requestId, reportRequests.id))
    .where(eq(requestProperties.propertyId, propertyId)).orderBy(desc(reportRequests.createdAt));
  const documents = await db.select().from(reportDocuments).where(eq(reportDocuments.propertyId, propertyId)).orderBy(desc(reportDocuments.createdAt));
  return { property, requests, documents };
}

export async function upsertManagerContacts(contacts: ManagerContactInput[]) {
  const db = await requireDb();
  for (const contact of contacts) {
    await db.insert(managerContacts).values(contact).onDuplicateKeyUpdate({ set: { propertyName: contact.propertyName, normalizedPropertyName: contact.normalizedPropertyName, managerName: contact.managerName, email: contact.email, region: contact.region, isRegionalManager: contact.isRegionalManager, syncedAt: new Date() } });
  }
}

export async function getManagerContactMatch(propertyName: string) {
  const db = await requireDb();
  const contacts = await db.select().from(managerContacts);
  return matchManagerContacts(propertyName, contacts.map(contact => ({ ...contact, normalizedPropertyName: contact.normalizedPropertyName ?? (contact.propertyName ? normalizePropertyName(contact.propertyName) : null) })));
}

export async function generateManagerChecklist(input: { requestId: number; propertyId: number }) {
  const db = await requireDb();
  const [request, property, requestProperty] = await Promise.all([
    db.select().from(reportRequests).where(eq(reportRequests.id, input.requestId)).limit(1),
    db.select().from(properties).where(eq(properties.id, input.propertyId)).limit(1),
    db.select().from(requestProperties).where(and(eq(requestProperties.requestId, input.requestId), eq(requestProperties.propertyId, input.propertyId))).limit(1),
  ]);
  const requestRow = request[0];
  const propertyRow = property[0];
  if (!requestRow || !propertyRow || !requestProperty[0]) throw new Error("The selected property is not associated with this report request.");
  const [documents, contacts] = await Promise.all([
    db.select({ originalFilename: reportDocuments.originalFilename, storageUrl: reportDocuments.storageUrl }).from(reportDocuments).where(and(eq(reportDocuments.requestId, input.requestId), eq(reportDocuments.propertyId, input.propertyId))).orderBy(desc(reportDocuments.createdAt)),
    getManagerContactMatch(propertyRow.name),
  ]);
  return buildManagerChecklist({
    requestId: requestRow.id,
    source: requestRow.source,
    reportName: requestRow.requestedReportName,
    reportStatus: requestRow.status,
    generatedAt: requestRow.completedAt ?? requestRow.createdAt,
    property: propertyRow,
    summaryMarkdown: requestRow.summaryMarkdown,
    warningSummary: requestRow.warningSummary,
    documents,
    contacts,
  });
}

export async function getDashboardOverview() {
  const db = await requireDb();
  const [recentRequests, activePropertyRows, catalogRows, liveEdge] = await Promise.all([
    listRecentRequests(8),
    db.select({ count: count() }).from(properties).where(eq(properties.active, true)),
    db.select({ count: count() }).from(reportCatalog).where(eq(reportCatalog.active, true)),
    getOperationalConfig("live_edge_status"),
  ]);
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const statusRows = await db.select({ status: reportRequests.status, count: count() }).from(reportRequests).where(gte(reportRequests.createdAt, since)).groupBy(reportRequests.status);
  return {
    recentRequests,
    statusCounts: Object.fromEntries(statusRows.map(row => [row.status, row.count])),
    activeProperties: activePropertyRows[0]?.count ?? 0,
    activeCatalogEntries: catalogRows[0]?.count ?? 0,
    liveEdgeStatus: liveEdge?.configValue ?? "unavailable",
  };
}

export async function claimRunnerRequest(input: { source: RunnerSource; requestId?: number; minimumRequestId?: number }) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const conditions = [eq(reportRequests.status, "queued"), eq(reportRequests.source, input.source)];
    if (input.requestId) conditions.push(eq(reportRequests.id, input.requestId));
    if (input.minimumRequestId) conditions.push(gte(reportRequests.id, input.minimumRequestId));
    const candidate = (await tx.select().from(reportRequests).where(and(...conditions)).orderBy(asc(reportRequests.createdAt)).limit(1))[0];
    if (!candidate) return { request: null, properties: [] };
    const update = await tx.update(reportRequests).set({ status: "claimed", claimedAt: new Date() }).where(and(eq(reportRequests.id, candidate.id), eq(reportRequests.status, "queued")));
    if (update[0].affectedRows !== 1) return { request: null, properties: [] };
    await tx.insert(requestEvents).values({ requestId: candidate.id, eventType: "claimed", detail: "Runner claimed the request." });
    const requestPropertiesRows = await tx.select({ id: properties.id, externalId: properties.externalId, name: requestProperties.propertyNameSnapshot })
      .from(requestProperties).innerJoin(properties, eq(requestProperties.propertyId, properties.id)).where(eq(requestProperties.requestId, candidate.id)).orderBy(asc(requestProperties.propertyNameSnapshot));
    return { request: { ...candidate, status: "claimed" as const }, properties: requestPropertiesRows };
  });
}

export async function recordRunnerProgress(requestId: number, sourceRunReference: string) {
  const db = await requireDb();
  const current = (await db.select({ status: reportRequests.status }).from(reportRequests).where(eq(reportRequests.id, requestId)).limit(1))[0];
  if (!current) throw new Error("Report request was not found.");
  assertRequestTransition(current.status as RequestStatus, "in_progress");
  await db.update(reportRequests).set({ status: "in_progress", sourceRunReference }).where(eq(reportRequests.id, requestId));
  await db.insert(requestEvents).values({ requestId, eventType: "in_progress", detail: sourceRunReference });
}

export async function completeRunnerRequest(input: { requestId: number; status: "completed" | "completed_with_warnings" | "failed"; warningSummary?: string; errorMessage?: string; summaryMarkdown?: string }) {
  const db = await requireDb();
  const current = (await db.select({ status: reportRequests.status, source: reportRequests.source, requestedReportName: reportRequests.requestedReportName }).from(reportRequests).where(eq(reportRequests.id, input.requestId)).limit(1))[0];
  if (!current) throw new Error("Report request was not found.");
  assertRequestTransition(current.status as RequestStatus, input.status);
  const completedAt = new Date();
  const summaryHtml = renderReportSummaryHtml({ source: current.source, reportName: current.requestedReportName, status: input.status, requestId: input.requestId, completedAt, summaryMarkdown: input.summaryMarkdown, warningSummary: input.warningSummary, errorMessage: input.errorMessage });
  await db.update(reportRequests).set({
    status: input.status,
    warningSummary: input.warningSummary ?? null,
    errorMessage: input.errorMessage ?? null,
    summaryMarkdown: input.summaryMarkdown ?? null,
    summaryHtml,
    completedAt,
  }).where(eq(reportRequests.id, input.requestId));
  await db.insert(requestEvents).values({ requestId: input.requestId, eventType: input.status, detail: input.errorMessage ?? input.warningSummary ?? "Runner completed request." });
}

export async function createReportDocument(input: { requestId: number; source: RunnerSource; propertyId?: number; propertyName: string; originalFilename: string; mimeType: string; documentKind: "source_report" | "property_workbook" | "manager_checklist"; storageKey: string; storageUrl: string; sizeBytes: number }) {
  const db = await requireDb();
  await db.insert(reportDocuments).values(input);
  await db.insert(requestEvents).values({ requestId: input.requestId, eventType: "document_filed", detail: `${input.originalFilename} filed for ${input.propertyName}.` });
}

export async function getOperationalConfig(configKey: string) {
  const db = await requireDb();
  const rows = await db.select().from(operationalConfig).where(eq(operationalConfig.configKey, configKey)).limit(1);
  return rows[0];
}

export async function setOperationalConfig(configKey: string, configValue: string) {
  const db = await requireDb();
  await db.insert(operationalConfig).values({ configKey, configValue }).onDuplicateKeyUpdate({ set: { configValue, updatedAt: new Date() } });
}

export async function setLiveEdgeStatus(source: RunnerSource, input: { status: "ready" | "unavailable" | "interactive_required"; detail?: string }) {
  await setOperationalConfig(`runner_session:${source}`, JSON.stringify({ source, ...input, updatedAt: new Date().toISOString() }));
}

export async function getRunnerSessionStatus(source: RunnerSource) {
  return getOperationalConfig(`runner_session:${source}`);
}

export async function syncCatalogFromRunner(source: RunnerSource, reports: Array<{ catalogKey: string; name: string; reportArea?: string; reportLevel?: string; product?: string; availableFormats?: Array<"excel" | "pdf" | "csv">; runnerMetadata?: Record<string, unknown> }>, options: { expectedTotal: number; complete: boolean }) {
  if (!options.complete || !Number.isInteger(options.expectedTotal) || options.expectedTotal < 1 || reports.length !== options.expectedTotal) {
    throw new Error("Catalog synchronization requires a complete payload whose expected total matches its report count.");
  }
  const activeKeys = reports.map(report => report.catalogKey);
  const db = await requireDb();
  await db.transaction(async tx => {
    const currentRows = await tx.select().from(reportCatalog).where(eq(reportCatalog.source, source));
    const currentByKey = new Map(currentRows.map(row => [row.catalogKey, row]));
    for (const report of reports) {
      const suppliedMetadata = report.runnerMetadata && Object.keys(report.runnerMetadata).length ? report.runnerMetadata : undefined;
      await tx.insert(reportCatalog).values({
        source,
        catalogKey: report.catalogKey,
        exactReportName: report.name,
        reportArea: report.reportArea ?? null,
        reportLevel: report.reportLevel ?? null,
        product: report.product ?? null,
        availableFormats: report.availableFormats?.length ? report.availableFormats : ["excel"],
        runnerMetadata: suppliedMetadata ?? currentByKey.get(report.catalogKey)?.runnerMetadata ?? {},
        active: true,
      }).onDuplicateKeyUpdate({ set: {
        exactReportName: report.name,
        reportArea: report.reportArea ?? null,
        reportLevel: report.reportLevel ?? null,
        product: report.product ?? null,
        availableFormats: report.availableFormats?.length ? report.availableFormats : ["excel"],
        runnerMetadata: suppliedMetadata ?? currentByKey.get(report.catalogKey)?.runnerMetadata ?? {},
        active: true,
      } });
    }
    await tx.update(reportCatalog).set({ active: false }).where(and(eq(reportCatalog.source, source), notInArray(reportCatalog.catalogKey, activeKeys)));
  });
}

export async function syncPropertiesFromRunner(source: RunnerSource, incoming: Array<{ externalId: string; name: string; market?: string; active?: boolean }>) {
  const db = await requireDb();
  const incomingExternalIds = incoming.map(property => property.externalId.trim().slice(0, 128)).filter(Boolean);
  for (const property of incoming) {
    const externalId = property.externalId.trim().slice(0, 128);
    const name = property.name.trim().slice(0, 255);
    if (!externalId || !name) continue;
    await db.insert(properties).values({
      externalId,
      name,
      market: property.market?.trim().slice(0, 128) || null,
      active: property.active ?? true,
    }).onDuplicateKeyUpdate({ set: {
      name,
      market: property.market?.trim().slice(0, 128) || null,
      active: property.active ?? true,
      updatedAt: new Date(),
    } });
  }
  if (source === "onesite" && incomingExternalIds.length) {
    await db.update(properties).set({ active: false, updatedAt: new Date() }).where(and(like(properties.externalId, "onesite:%"), notInArray(properties.externalId, incomingExternalIds)));
  }
  await setOperationalConfig(`property_sync:${source}`, JSON.stringify({ source, count: incoming.length, updatedAt: new Date().toISOString() }));
}

export async function syncPropertyContactsFromRunner(contacts: Array<Record<string, unknown>>) {
  for (const contact of contacts) {
    const externalId = typeof contact.externalId === "string" ? contact.externalId : undefined;
    const propertyName = typeof contact.propertyName === "string" ? contact.propertyName : undefined;
    const managerName = typeof contact.managerName === "string" ? contact.managerName : null;
    const managerEmail = typeof contact.managerEmail === "string" ? contact.managerEmail : null;
    if (!externalId && !propertyName) continue;
    const db = await requireDb();
    const target = externalId
      ? (await db.select().from(properties).where(eq(properties.externalId, externalId)).limit(1))[0]
      : await getPropertyByName(propertyName!);
    if (target) await db.update(properties).set({ managerName, managerEmail }).where(eq(properties.id, target.id));
  }
}
