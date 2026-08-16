import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, portfolioProcedure, portalProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { canAccessProperty, getPortalAccessForUser } from "./portalAccess";
import { listAccessAssignableProperties, listPortalAccessRules, savePortalAccessRule, setPortalAccessRuleActive } from "./accessAdmin";
import { compareReportingPeriods, getDashboard, getPeriodExportRows, getPropertyDetail, getSourceDocumentPreview, importDelinquencyBatch, listReportingPeriods } from "./delinquency";
import { getRealPageAutomation, listRealPageRuns, queueRealPageRun, saveRealPageAutomation } from "./automation";
import { getLiveEdgeRunnerStatus, listOneSiteInternalNotificationUsers, listOneSitePropertyContacts, listOneSiteReportCatalog, listOneSiteReportDocuments, listOneSiteReportRequests, queueCatalogPropertyReportRequest, queueCatalogReportRequest, queueCustomReportRequest, queueMyReportsSynchronization } from "./onesiteReporting";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    portalAccess: publicProcedure.query(async opts => (opts.ctx.user ? getPortalAccessForUser(opts.ctx.user) : null)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  access: router({
    rules: adminProcedure.query(() => listPortalAccessRules()),
    properties: adminProcedure.query(() => listAccessAssignableProperties()),
    saveRule: adminProcedure.input(z.object({
      email: z.string().trim().email().max(320),
      role: z.enum(["boss", "manager"]),
      propertyIds: z.array(z.number().int().positive()).max(35).default([]),
    }).superRefine((value, ctx) => {
      if (value.role === "manager" && value.propertyIds.length === 0) {
        ctx.addIssue({ code: "custom", path: ["propertyIds"], message: "Assign at least one property to a manager." });
      }
    })).mutation(({ input, ctx }) => savePortalAccessRule({ ...input, createdByUserId: ctx.user.id })),
    setActive: adminProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
      .mutation(({ input }) => setPortalAccessRuleActive(input)),
  }),

  delinquency: router({
    periods: portalProcedure.query(() => listReportingPeriods()),
    dashboard: portfolioProcedure.input(z.object({ reportingPeriodId: z.number().int().optional() }).optional()).query(({ input }) => getDashboard(input?.reportingPeriodId)),
    managerDashboard: portalProcedure.input(z.object({ reportingPeriodId: z.number().int().optional() }).optional()).query(({ input, ctx }) => getDashboard(input?.reportingPeriodId, ctx.portalAccess.role === "manager" ? ctx.portalAccess.propertyIds ?? [] : undefined)),
    propertyDetail: portalProcedure.input(z.object({ reportingPeriodId: z.number().int(), propertyId: z.number().int() })).query(({ input, ctx }) => {
      if (!canAccessProperty(ctx.portalAccess, input.propertyId)) throw new Error("You are not assigned to this property.");
      return getPropertyDetail(input);
    }),
    sourceDocumentPreview: portalProcedure.input(z.object({ sourceFileId: z.number().int().positive() })).query(({ input, ctx }) => getSourceDocumentPreview(input, ctx.portalAccess.role === "manager" ? ctx.portalAccess.propertyIds ?? [] : undefined)),
    compare: portfolioProcedure.input(z.object({ currentPeriodId: z.number().int(), priorPeriodId: z.number().int() })).query(({ input }) => compareReportingPeriods(input)),
    exportRows: portfolioProcedure.input(z.object({ reportingPeriodId: z.number().int() })).query(({ input }) => getPeriodExportRows(input.reportingPeriodId)),
    importBatch: adminProcedure.input(z.object({
      name: z.string().trim().min(3).max(160),
      fiscalPeriod: z.string().trim().min(3).max(32),
      asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      files: z.array(z.object({ filename: z.string().min(5).max(512), dataBase64: z.string().min(1) })).min(1).max(35),
    })).mutation(({ input, ctx }) => importDelinquencyBatch({ ...input, importedByUserId: ctx.user.id })),
    automation: router({
      get: adminProcedure.query(() => getRealPageAutomation()),
      save: adminProcedure.input(z.object({
        cronExpression: z.string().trim().min(11).max(64),
        timezone: z.string().trim().min(3).max(64),
        isEnabled: z.boolean(),
        parameters: z.object({
          delinquencyReportName: z.literal("Delinquency (Current Residents)"),
          delinquencyFormat: z.literal("excel"),
          includeAvailabilityPdf: z.boolean(),
          includeZeroBalance: z.boolean(),
          residentScope: z.literal("current_residents_only"),
          propertyScope: z.literal("mapped_realpage"),
        }),
      })).mutation(({ input }) => saveRealPageAutomation(input)),
      queueRun: adminProcedure.mutation(() => queueRealPageRun("manual")),
      runs: adminProcedure.query(() => listRealPageRuns()),
    }),
  }),

  onesiteReporting: router({
    catalog: portfolioProcedure.query(() => listOneSiteReportCatalog()),
    requests: portfolioProcedure.query(() => listOneSiteReportRequests()),
    documents: portalProcedure.query(({ ctx }) => listOneSiteReportDocuments(ctx.portalAccess.role === "manager" ? ctx.portalAccess.propertyIds ?? [] : undefined)),
    liveEdgeStatus: portfolioProcedure.query(() => getLiveEdgeRunnerStatus()),
    propertyContacts: portalProcedure.query(({ ctx }) => listOneSitePropertyContacts(ctx.portalAccess.role === "manager" ? ctx.portalAccess.propertyIds ?? [] : undefined)),
    internalNotificationUsers: portfolioProcedure.query(() => listOneSiteInternalNotificationUsers()),
    queueCatalogReport: adminProcedure.input(z.object({
      catalogId: z.number().int().positive(),
      format: z.enum(["excel", "pdf", "csv"]).optional(),
      settings: z.object({
        mode: z.enum(["generate_now", "schedule_later"]).default("generate_now"),
        scheduledFor: z.string().datetime({ offset: true }).optional(),
        externalEmails: z.array(z.string().email()).max(20).default([]),
        notifyUserIds: z.array(z.number().int().positive()).max(50).default([]),
        cloudService: z.string().trim().max(160).optional(),
        reportParameters: z.record(z.string().max(120), z.union([z.string().trim().max(500), z.boolean()])).default({}),
      }).optional(),
    }).superRefine((value, ctx) => {
      if (value.settings?.mode === "schedule_later" && !value.settings.scheduledFor) ctx.addIssue({ code: "custom", path: ["settings", "scheduledFor"], message: "Choose a scheduled date and time." });
    })).mutation(({ input, ctx }) => queueCatalogReportRequest({ ...input, requestedByUserId: ctx.user.id })),
    queueCatalogPropertyReport: adminProcedure.input(z.object({
      catalogId: z.number().int().positive(),
      propertyId: z.number().int().positive(),
      format: z.enum(["excel", "pdf", "csv"]).optional(),
      settings: z.object({
        mode: z.enum(["generate_now", "schedule_later"]).default("generate_now"),
        scheduledFor: z.string().datetime({ offset: true }).optional(),
        externalEmails: z.array(z.string().email()).max(20).default([]),
        notifyUserIds: z.array(z.number().int().positive()).max(50).default([]),
        cloudService: z.string().trim().max(160).optional(),
        reportParameters: z.record(z.string().max(120), z.union([z.string().trim().max(500), z.boolean()])).default({}),
      }).optional(),
    }).superRefine((value, ctx) => {
      if (value.settings?.mode === "schedule_later" && !value.settings.scheduledFor) ctx.addIssue({ code: "custom", path: ["settings", "scheduledFor"], message: "Choose a scheduled date and time." });
    })).mutation(({ input, ctx }) => queueCatalogPropertyReportRequest({ ...input, requestedByUserId: ctx.user.id })),
    queueCustomReport: adminProcedure.input(z.object({ exactReportName: z.string().trim().min(2).max(255), format: z.enum(["excel", "pdf", "csv"]) })).mutation(({ input, ctx }) => queueCustomReportRequest({ ...input, requestedByUserId: ctx.user.id })),
    syncMyReports: adminProcedure.mutation(({ ctx }) => queueMyReportsSynchronization({ requestedByUserId: ctx.user.id })),
  }),

});

export type AppRouter = typeof appRouter;
