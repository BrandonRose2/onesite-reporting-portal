import {
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const properties = mysqlTable(
  "properties",
  {
    id: int("id").autoincrement().primaryKey(),
    externalId: varchar("externalId", { length: 32 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    region: mysqlEnum("region", ["Region 1", "Region 2", "Region 3", "Region 4"]).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("properties_region_idx").on(table.region)]
);

export const reportingPeriods = mysqlTable(
  "reportingPeriods",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    fiscalPeriod: varchar("fiscalPeriod", { length: 32 }).notNull(),
    asOfDate: date("asOfDate").notNull(),
    status: mysqlEnum("status", ["draft", "ready", "failed"]).default("draft").notNull(),
    sourceFileCount: int("sourceFileCount").default(0).notNull(),
    importedByUserId: int("importedByUserId"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    importedAt: timestamp("importedAt"),
  },
  table => [uniqueIndex("reporting_periods_name_uidx").on(table.name), index("reporting_periods_asof_idx").on(table.asOfDate)]
);

export const sourceFiles = mysqlTable(
  "sourceFiles",
  {
    id: int("id").autoincrement().primaryKey(),
    reportingPeriodId: int("reportingPeriodId").notNull(),
    propertyId: int("propertyId").notNull(),
    originalFilename: varchar("originalFilename", { length: 512 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    checksumSha256: varchar("checksumSha256", { length: 64 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    parsedRowCount: int("parsedRowCount").default(0).notNull(),
    isSelectedExport: boolean("isSelectedExport").default(true).notNull(),
    importedAt: timestamp("importedAt").defaultNow().notNull(),
  },
  table => [
    index("source_files_period_idx").on(table.reportingPeriodId),
    index("source_files_property_idx").on(table.propertyId),
  ]
);

export const propertyPeriodSummaries = mysqlTable(
  "propertyPeriodSummaries",
  {
    id: int("id").autoincrement().primaryKey(),
    reportingPeriodId: int("reportingPeriodId").notNull(),
    propertyId: int("propertyId").notNull(),
    sourceFileId: int("sourceFileId"),
    residentCount: int("residentCount").default(0).notNull(),
    delinquentUnits: int("delinquentUnits").default(0).notNull(),
    netPrepaid: decimal("netPrepaid", { precision: 14, scale: 2 }).default("0.00").notNull(),
    netDelinquent: decimal("netDelinquent", { precision: 14, scale: 2 }).default("0.00").notNull(),
    netBalance: decimal("netBalance", { precision: 14, scale: 2 }).default("0.00").notNull(),
    currentAmount: decimal("currentAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
    days30Amount: decimal("days30Amount", { precision: 14, scale: 2 }).default("0.00").notNull(),
    days60Amount: decimal("days60Amount", { precision: 14, scale: 2 }).default("0.00").notNull(),
    days90PlusAmount: decimal("days90PlusAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("property_period_summary_uidx").on(table.reportingPeriodId, table.propertyId),
    index("property_period_summary_property_idx").on(table.propertyId),
  ]
);

export const residentLedgerRows = mysqlTable(
  "residentLedgerRows",
  {
    id: int("id").autoincrement().primaryKey(),
    reportingPeriodId: int("reportingPeriodId").notNull(),
    propertyId: int("propertyId").notNull(),
    sourceFileId: int("sourceFileId").notNull(),
    residentKey: varchar("residentKey", { length: 96 }).notNull(),
    reshId: varchar("reshId", { length: 64 }),
    leaseId: varchar("leaseId", { length: 64 }),
    unit: varchar("unit", { length: 80 }),
    residentName: varchar("residentName", { length: 255 }),
    phoneNumber: varchar("phoneNumber", { length: 80 }),
    email: varchar("email", { length: 320 }),
    residentStatus: varchar("residentStatus", { length: 96 }),
    moveInOut: varchar("moveInOut", { length: 96 }),
    transactionCode: varchar("transactionCode", { length: 64 }),
    codeDescription: varchar("codeDescription", { length: 255 }),
    totalPrepaid: decimal("totalPrepaid", { precision: 14, scale: 2 }).default("0.00").notNull(),
    totalDelinquent: decimal("totalDelinquent", { precision: 14, scale: 2 }).default("0.00").notNull(),
    netBalance: decimal("netBalance", { precision: 14, scale: 2 }).default("0.00").notNull(),
    currentAmount: decimal("currentAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
    days30Amount: decimal("days30Amount", { precision: 14, scale: 2 }).default("0.00").notNull(),
    days60Amount: decimal("days60Amount", { precision: 14, scale: 2 }).default("0.00").notNull(),
    days90PlusAmount: decimal("days90PlusAmount", { precision: 14, scale: 2 }).default("0.00").notNull(),
    depositsCreditsHeld: decimal("depositsCreditsHeld", { precision: 14, scale: 2 }).default("0.00").notNull(),
    lateCount: int("lateCount").default(0).notNull(),
    nsfCount: int("nsfCount").default(0).notNull(),
    collectionNotes: text("collectionNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("ledger_period_property_idx").on(table.reportingPeriodId, table.propertyId),
    index("ledger_resident_key_idx").on(table.residentKey),
  ]
);

export const propertySources = mysqlTable(
  "propertySources",
  {
    id: int("id").autoincrement().primaryKey(),
    propertyId: int("propertyId").notNull().unique(),
    sourceSystem: mysqlEnum("sourceSystem", ["realpage", "yardi"]).notNull(),
    sourcePropertyId: varchar("sourcePropertyId", { length: 96 }).notNull(),
    sourceUrl: varchar("sourceUrl", { length: 1024 }),
    isAutomated: boolean("isAutomated").default(false).notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("property_sources_system_idx").on(table.sourceSystem)]
);

export const retrievalAutomations = mysqlTable(
  "retrievalAutomations",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceSystem: mysqlEnum("sourceSystem", ["realpage", "yardi"]).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    sourceUrl: varchar("sourceUrl", { length: 1024 }),
    isEnabled: boolean("isEnabled").default(false).notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    cronExpression: varchar("cronExpression", { length: 64 }),
    timezone: varchar("timezone", { length: 64 }).default("America/Los_Angeles").notNull(),
    parametersJson: text("parametersJson"),
    lastSuccessfulRunAt: timestamp("lastSuccessfulRunAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("retrieval_automations_schedule_idx").on(table.scheduleCronTaskUid)]
);

export const scrapeRuns = mysqlTable(
  "scrapeRuns",
  {
    id: int("id").autoincrement().primaryKey(),
    retrievalAutomationId: int("retrievalAutomationId"),
    sourceSystem: mysqlEnum("sourceSystem", ["realpage", "yardi"]).notNull(),
    trigger: mysqlEnum("trigger", ["manual", "scheduled"]).notNull(),
    status: mysqlEnum("status", ["queued", "running", "completed", "completed_with_warnings", "failed"]).default("queued").notNull(),
    reportingPeriodId: int("reportingPeriodId"),
    propertiesAttempted: int("propertiesAttempted").default(0).notNull(),
    propertiesSucceeded: int("propertiesSucceeded").default(0).notNull(),
    documentsStored: int("documentsStored").default(0).notNull(),
    ledgerRowsImported: int("ledgerRowsImported").default(0).notNull(),
    validationSummary: text("validationSummary"),
    warnings: text("warnings"),
    errorMessage: text("errorMessage"),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("scrape_runs_source_started_idx").on(table.sourceSystem, table.startedAt),
    index("scrape_runs_period_idx").on(table.reportingPeriodId),
  ]
);

export const reportCatalog = mysqlTable(
  "reportCatalog",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceSystem: mysqlEnum("sourceSystem", ["realpage", "yardi"]).notNull().default("realpage"),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    displayName: varchar("displayName", { length: 255 }).notNull(),
    exactReportName: varchar("exactReportName", { length: 255 }).notNull(),
    searchTerm: varchar("searchTerm", { length: 160 }).notNull(),
    defaultFormat: mysqlEnum("defaultFormat", ["excel", "pdf", "csv"]).notNull(),
    reportArea: varchar("reportArea", { length: 160 }),
    reportLevel: varchar("reportLevel", { length: 80 }),
    product: varchar("product", { length: 160 }),
    settingsSchemaJson: text("settingsSchemaJson"),
    description: text("description"),
    isVerified: boolean("isVerified").default(false).notNull(),
    isApproved: boolean("isApproved").default(false).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("report_catalog_source_active_idx").on(table.sourceSystem, table.isActive)]
);

export const reportRequests = mysqlTable(
  "reportRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceSystem: mysqlEnum("sourceSystem", ["realpage", "yardi"]).notNull().default("realpage"),
    requestType: mysqlEnum("requestType", ["generate_all_properties", "sync_my_reports"]).notNull(),
    status: mysqlEnum("status", ["queued", "running", "completed", "completed_with_warnings", "failed"]).default("queued").notNull(),
    reportCatalogId: int("reportCatalogId"),
    requestedReportName: varchar("requestedReportName", { length: 255 }).notNull(),
    requestedFormat: mysqlEnum("requestedFormat", ["excel", "pdf", "csv"]).notNull(),
    propertyScope: varchar("propertyScope", { length: 64 }).default("all_properties").notNull(),
    requestedByUserId: int("requestedByUserId").notNull(),
    sourceRunReference: varchar("sourceRunReference", { length: 160 }),
    parameterJson: text("parameterJson"),
    documentCount: int("documentCount").default(0).notNull(),
    summaryMarkdown: text("summaryMarkdown"),
    warningSummary: text("warningSummary"),
    errorMessage: text("errorMessage"),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
  },
  table => [index("report_requests_status_requested_idx").on(table.status, table.requestedAt), index("report_requests_catalog_idx").on(table.reportCatalogId)]
);

export const reportDocuments = mysqlTable(
  "reportDocuments",
  {
    id: int("id").autoincrement().primaryKey(),
    reportRequestId: int("reportRequestId").notNull(),
    propertyId: int("propertyId"),
    documentKind: mysqlEnum("documentKind", ["source_report", "property_markdown", "property_pdf", "portfolio_markdown", "portfolio_pdf"]).notNull(),
    originalFilename: varchar("originalFilename", { length: 512 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    fileSizeBytes: int("fileSizeBytes").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("report_documents_request_idx").on(table.reportRequestId), index("report_documents_property_idx").on(table.propertyId)]
);

export type Property = typeof properties.$inferSelect;
export type ReportingPeriod = typeof reportingPeriods.$inferSelect;
export type SourceFile = typeof sourceFiles.$inferSelect;
export type PropertyPeriodSummary = typeof propertyPeriodSummaries.$inferSelect;
export type ResidentLedgerRow = typeof residentLedgerRows.$inferSelect;
export type PropertySource = typeof propertySources.$inferSelect;
export type RetrievalAutomation = typeof retrievalAutomations.$inferSelect;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;
export type ReportCatalogEntry = typeof reportCatalog.$inferSelect;
export type ReportRequest = typeof reportRequests.$inferSelect;
export type ReportDocument = typeof reportDocuments.$inferSelect;
