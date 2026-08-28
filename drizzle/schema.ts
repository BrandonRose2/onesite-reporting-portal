import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("source", ["onesite", "yardi"]).notNull().default("onesite"),
  externalId: varchar("externalId", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  market: varchar("market", { length: 128 }),
  managerName: varchar("managerName", { length: 255 }),
  managerEmail: varchar("managerEmail", { length: 320 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("properties_source_external_id_unique").on(table.source, table.externalId), index("properties_source_active_name_idx").on(table.source, table.active, table.name)]);

export const reportCatalog = mysqlTable("reportCatalog", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("source", ["onesite", "yardi"]).notNull().default("onesite"),
  catalogKey: varchar("catalogKey", { length: 160 }).notNull(),
  exactReportName: varchar("exactReportName", { length: 255 }).notNull(),
  reportArea: varchar("reportArea", { length: 128 }),
  reportLevel: varchar("reportLevel", { length: 128 }),
  product: varchar("product", { length: 128 }),
  availableFormats: json("availableFormats").$type<Array<"excel" | "pdf" | "csv">>().notNull(),
  runnerMetadata: json("runnerMetadata").$type<Record<string, unknown>>().notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("report_catalog_source_key_unique").on(table.source, table.catalogKey), index("report_catalog_source_active_name_idx").on(table.source, table.active, table.exactReportName)]);

export const reportRequests = mysqlTable("reportRequests", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("source", ["onesite", "yardi"]).notNull().default("onesite"),
  requestType: mysqlEnum("requestType", ["generate_all_properties", "generate_property", "sync_my_reports"]).notNull(),
  requestedReportName: varchar("requestedReportName", { length: 255 }).notNull(),
  requestedFormat: mysqlEnum("requestedFormat", ["excel", "pdf", "csv"]).notNull(),
  status: mysqlEnum("status", ["queued", "claimed", "in_progress", "completed", "completed_with_warnings", "failed"]).default("queued").notNull(),
  parameters: json("parameters").$type<Record<string, unknown>>().notNull(),
  warningSummary: text("warningSummary"),
  errorMessage: text("errorMessage"),
  historyNote: text("historyNote"),
  archivedById: int("archivedById"),
  archivedAt: timestamp("archivedAt"),
  summaryMarkdown: text("summaryMarkdown"),
  summaryHtml: text("summaryHtml"),
  sourceRunReference: varchar("sourceRunReference", { length: 500 }),
  requestedById: int("requestedById"),
  executionAuthorizedById: int("executionAuthorizedById"),
  executionAuthorizedAt: timestamp("executionAuthorizedAt"),
  claimedAt: timestamp("claimedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("report_requests_source_status_created_idx").on(table.source, table.status, table.createdAt), index("report_requests_requester_created_idx").on(table.requestedById, table.createdAt)]);

export const reportUserDefaults = mysqlTable("reportUserDefaults", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("source", ["onesite", "yardi"]).notNull(),
  reportCatalogId: int("reportCatalogId").notNull(),
  userId: int("userId").notNull(),
  requestedFormat: mysqlEnum("requestedFormat", ["excel", "pdf", "csv"]).notNull(),
  parameterValues: json("parameterValues").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("report_user_defaults_source_catalog_user_unique").on(table.source, table.reportCatalogId, table.userId), index("report_user_defaults_user_updated_idx").on(table.userId, table.updatedAt)]);

export const requestProperties = mysqlTable("requestProperties", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  propertyId: int("propertyId").notNull(),
  propertyNameSnapshot: varchar("propertyNameSnapshot", { length: 255 }).notNull(),
}, table => [uniqueIndex("request_property_unique").on(table.requestId, table.propertyId), index("request_properties_property_idx").on(table.propertyId)]);

export const reportDocuments = mysqlTable("reportDocuments", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  source: mysqlEnum("source", ["onesite", "yardi"]).notNull().default("onesite"),
  propertyId: int("propertyId"),
  propertyName: varchar("propertyName", { length: 255 }).notNull(),
  documentKind: mysqlEnum("documentKind", ["source_report", "property_workbook", "workbook_html", "manager_checklist"]).default("source_report").notNull(),
  originalFilename: varchar("originalFilename", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 2048 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("report_documents_request_created_idx").on(table.requestId, table.createdAt), index("report_documents_source_property_created_idx").on(table.source, table.propertyId, table.createdAt)]);

export const requestEvents = mysqlTable("requestEvents", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  eventType: varchar("eventType", { length: 96 }).notNull(),
  detail: text("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("request_events_request_created_idx").on(table.requestId, table.createdAt)]);

export const managerContacts = mysqlTable("managerContacts", {
  id: int("id").autoincrement().primaryKey(),
  contactKey: varchar("contactKey", { length: 128 }).notNull(),
  propertyName: varchar("propertyName", { length: 255 }),
  normalizedPropertyName: varchar("normalizedPropertyName", { length: 255 }),
  managerName: varchar("managerName", { length: 255 }),
  recordName: varchar("recordName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  officePhone: varchar("officePhone", { length: 64 }),
  mobilePhone: varchar("mobilePhone", { length: 64 }),
  phoneExtension: varchar("phoneExtension", { length: 32 }),
  region: varchar("region", { length: 64 }),
  isRegionalManager: boolean("isRegionalManager").default(false).notNull(),
  source: varchar("source", { length: 64 }).notNull().default("notion_company_contacts"),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("manager_contacts_key_unique").on(table.contactKey), index("manager_contacts_property_idx").on(table.normalizedPropertyName), index("manager_contacts_region_regional_idx").on(table.region, table.isRegionalManager)]);

export const managerChecklistReviews = mysqlTable("managerChecklistReviews", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  propertyId: int("propertyId").notNull(),
  status: mysqlEnum("status", ["in_progress", "submitted"]).default("in_progress").notNull(),
  checklistState: json("checklistState").$type<Record<string, unknown>>().notNull(),
  managerSummary: text("managerSummary"),
  submittedById: int("submittedById"),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("manager_checklist_request_property_unique").on(table.requestId, table.propertyId),
  index("manager_checklist_property_status_idx").on(table.propertyId, table.status),
]);

export const operationalConfig = mysqlTable("operationalConfig", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 128 }).notNull(),
  configValue: text("configValue"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("operational_config_key_unique").on(table.configKey)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type ReportCatalogEntry = typeof reportCatalog.$inferSelect;
export type ReportRequest = typeof reportRequests.$inferSelect;
