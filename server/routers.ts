import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { compareReportingPeriods, getDashboard, getPeriodExportRows, getPropertyDetail, getSourceDocumentPreview, importDelinquencyBatch, listReportingPeriods } from "./delinquency";
import { getRealPageAutomation, listRealPageRuns, queueRealPageRun, saveRealPageAutomation } from "./automation";
import { getLiveEdgeRunnerStatus, listOneSiteInternalNotificationUsers, listOneSitePropertyContacts, listOneSiteReportCatalog, listOneSiteReportRequests, queueCatalogReportRequest, queueCustomReportRequest, queueMyReportsSynchronization } from "./onesiteReporting";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  delinquency: router({
    periods: protectedProcedure.query(() => listReportingPeriods()),
    dashboard: protectedProcedure.input(z.object({ reportingPeriodId: z.number().int().optional() }).optional()).query(({ input }) => getDashboard(input?.reportingPeriodId)),
    propertyDetail: protectedProcedure.input(z.object({ reportingPeriodId: z.number().int(), propertyId: z.number().int() })).query(({ input }) => getPropertyDetail(input)),
    sourceDocumentPreview: protectedProcedure.input(z.object({ sourceFileId: z.number().int().positive() })).query(({ input }) => getSourceDocumentPreview(input)),
    compare: protectedProcedure.input(z.object({ currentPeriodId: z.number().int(), priorPeriodId: z.number().int() })).query(({ input }) => compareReportingPeriods(input)),
    exportRows: protectedProcedure.input(z.object({ reportingPeriodId: z.number().int() })).query(({ input }) => getPeriodExportRows(input.reportingPeriodId)),
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
          delinquencyReportName: z.literal("Delinquent and Prepaid (Excel)"),
          delinquencyFormat: z.literal("excel"),
          includeAvailabilityPdf: z.boolean(),
          includePrepaids: z.boolean(),
          includeZeroBalance: z.boolean(),
          propertyScope: z.literal("mapped_realpage"),
        }),
      })).mutation(({ input }) => saveRealPageAutomation(input)),
      queueRun: adminProcedure.mutation(() => queueRealPageRun("manual")),
      runs: adminProcedure.query(() => listRealPageRuns()),
    }),
  }),

  onesiteReporting: router({
    catalog: protectedProcedure.query(() => listOneSiteReportCatalog()),
    requests: protectedProcedure.query(() => listOneSiteReportRequests()),
    liveEdgeStatus: protectedProcedure.query(() => getLiveEdgeRunnerStatus()),
    propertyContacts: protectedProcedure.query(() => listOneSitePropertyContacts()),
    internalNotificationUsers: protectedProcedure.query(() => listOneSiteInternalNotificationUsers()),
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
    queueCustomReport: adminProcedure.input(z.object({ exactReportName: z.string().trim().min(2).max(255), format: z.enum(["excel", "pdf", "csv"]) })).mutation(({ input, ctx }) => queueCustomReportRequest({ ...input, requestedByUserId: ctx.user.id })),
    syncMyReports: adminProcedure.mutation(({ ctx }) => queueMyReportsSynchronization({ requestedByUserId: ctx.user.id })),
  }),

});

export type AppRouter = typeof appRouter;
