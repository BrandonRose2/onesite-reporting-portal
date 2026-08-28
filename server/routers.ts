import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createReportRequest,
  generateManagerChecklist,
  getAccessiblePropertyHistory,
  getAccessibleRequestDetails,
  getManagerChecklistReview,
  getReportUserDefaults,
  getDashboardOverview,
  getCatalogEntryById,
  getPropertyHistory,
  getRequestDetails,
  getManagerContactMatch,
  getRunnerSessionStatus,
  listCatalog,
  listAccessibleProperties,
  listAccessibleReportLibraryRequests,
  listManagerChecklistAssignments,
  listReportLibraryRequests,
  listProperties,
  listRecentRequests,
  upsertCatalogEntry,
  upsertProperty,
  saveManagerChecklistReview,
  submitManagerChecklistReview,
  upsertReportUserDefaults,
} from "./db";
import { knownOperationalLimitations } from "./operationalLimitations";
import { catalogSaveSchema, propertySaveSchema, reportUserDefaultsSaveSchema, requestCreateSchema, runnerSourceSchema } from "./validation";
import { getCatalogParameterDefinitions, getCompleteProviderEligiblePropertyNames, requiresProviderEligibility, validateCatalogParameterValues } from "./reportParameters";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required for this operation." });
  return next();
});

const checklistItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  sectionId: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  detail: z.string().trim().max(1000),
  status: z.enum(["pending", "confirmed", "follow_up", "escalated"]),
  notes: z.string().max(4000),
  targetDate: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
  reportedValue: z.string().max(120).optional(),
  correctedValue: z.string().max(120).optional(),
  sourceSheet: z.string().max(100).optional(),
  sourceRow: z.number().int().positive().optional(),
  requiresVerification: z.boolean().optional(),
});

const checklistReviewInput = z.object({
  requestId: z.number().int().positive(),
  propertyId: z.number().int().positive(),
  state: z.object({ version: z.literal(2), items: z.array(checklistItemSchema).max(500) }),
  managerSummary: z.string().max(8000),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    overview: adminProcedure.query(() => getDashboardOverview()),
  }),

  properties: router({
    list: protectedProcedure.input(z.object({ includeInactive: z.boolean().optional() }).optional()).query(({ ctx, input }) => input?.includeInactive && ctx.user.role === "admin" ? listProperties(true) : listAccessibleProperties(ctx.user)),
    details: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getAccessiblePropertyHistory(ctx.user, input.id)),
    save: adminProcedure.input(propertySaveSchema).mutation(({ input }) => upsertProperty(input)),
  }),

  catalog: router({
    list: protectedProcedure.input(z.object({ includeInactive: z.boolean().optional(), source: runnerSourceSchema.optional() }).optional()).query(({ input }) => listCatalog(input?.includeInactive ?? false, input?.source)),
    save: adminProcedure.input(catalogSaveSchema).mutation(({ input }) => upsertCatalogEntry(input)),
  }),

  requests: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional(), source: runnerSourceSchema.optional() }).optional()).query(({ ctx, input }) => ctx.user.role === "admin" ? listRecentRequests(input?.limit ?? 25, input?.source) : listAccessibleReportLibraryRequests(ctx.user, input?.limit ?? 25, input?.source)),
    library: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(250).optional(), source: runnerSourceSchema.optional() }).optional()).query(({ ctx, input }) => listAccessibleReportLibraryRequests(ctx.user, input?.limit ?? 200, input?.source)),
    details: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const details = await getAccessibleRequestDetails(ctx.user, input.id);
      if (!details) return undefined;
      const contactMatches = await Promise.all(details.properties.map(async property => ({ propertyName: property.name, ...(await getManagerContactMatch(property.name)) })));
      return { ...details, contactMatches };
    }),
    defaults: adminProcedure.input(z.object({ source: runnerSourceSchema, catalogId: z.number().int().positive() })).query(({ ctx, input }) => getReportUserDefaults({ source: input.source, reportCatalogId: input.catalogId, userId: ctx.user.id })),
    saveDefaults: adminProcedure.input(reportUserDefaultsSaveSchema).mutation(async ({ ctx, input }) => {
      const catalogEntry = await getCatalogEntryById(input.catalogId);
      if (!catalogEntry || !catalogEntry.active || catalogEntry.source !== input.source) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an active report from the matching source catalog." });
      if (!catalogEntry.availableFormats.includes(input.requestedFormat)) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected format is not approved for this source report." });
      const parameterErrors = validateCatalogParameterValues(getCatalogParameterDefinitions(catalogEntry.runnerMetadata), input.parameters);
      if (parameterErrors.length) throw new TRPCError({ code: "BAD_REQUEST", message: parameterErrors.join(" ") });
      return upsertReportUserDefaults({ source: input.source, reportCatalogId: input.catalogId, userId: ctx.user.id, requestedFormat: input.requestedFormat, parameterValues: input.parameters });
    }),
    create: adminProcedure.input(requestCreateSchema).mutation(async ({ ctx, input }) => {
      if (input.requestType === "sync_my_reports") return createReportRequest({ ...input, requestedById: ctx.user.id });
      const catalogEntry = await getCatalogEntryById(input.catalogId!);
      if (!catalogEntry || !catalogEntry.active || catalogEntry.source !== input.source) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an active report from the matching source catalog." });
      if (catalogEntry.exactReportName !== input.requestedReportName || !catalogEntry.availableFormats.includes(input.requestedFormat)) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected report title or format is not approved for this source." });
      const parameterErrors = validateCatalogParameterValues(getCatalogParameterDefinitions(catalogEntry.runnerMetadata), input.parameters);
      if (parameterErrors.length) throw new TRPCError({ code: "BAD_REQUEST", message: parameterErrors.join(" ") });
      const eligiblePropertyNames = input.requestType === "generate_all_properties"
        ? getCompleteProviderEligiblePropertyNames(catalogEntry.runnerMetadata)
        : null;
      if (input.requestType === "generate_all_properties" && requiresProviderEligibility(catalogEntry.runnerMetadata) && !eligiblePropertyNames) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This report requires a complete, verified provider property scope before it can be queued." });
      }
      await upsertReportUserDefaults({ source: input.source, reportCatalogId: catalogEntry.id, userId: ctx.user.id, requestedFormat: input.requestedFormat, parameterValues: input.parameters });
      return createReportRequest({
        ...input,
        parameters: {
          ...catalogEntry.runnerMetadata,
          exactReportName: catalogEntry.exactReportName,
          reportArea: catalogEntry.reportArea ?? undefined,
          reportLevel: catalogEntry.reportLevel ?? undefined,
          product: catalogEntry.product ?? undefined,
          generationSettings: { reportParameters: input.parameters },
        },
        requestedById: ctx.user.id,
        eligiblePropertyNames: eligiblePropertyNames ?? undefined,
      });
    }),
  }),

  operations: router({
    recoveryStatus: protectedProcedure.query(async () => {
      const [oneSite, yardi] = await Promise.all([getRunnerSessionStatus("onesite"), getRunnerSessionStatus("yardi")]);
      const parse = (value: typeof oneSite, source: "onesite" | "yardi") => {
        if (!value?.configValue) return { source, status: "unavailable", detail: `${source === "onesite" ? "OneSite" : "Yardi"} runner has not reported a live browser session yet.` };
        try { return JSON.parse(value.configValue); } catch { return { source, status: "unavailable", detail: "Runner status could not be read safely." }; }
      };
      const runners = { onesite: parse(oneSite, "onesite"), yardi: parse(yardi, "yardi") };
      return {
        liveEdge: runners.onesite,
        runners,
        limitations: knownOperationalLimitations,
      };
    }),
  }),

  checklists: router({
    generate: adminProcedure.input(z.object({ requestId: z.number().int().positive(), propertyId: z.number().int().positive() })).query(({ input }) => generateManagerChecklist(input)),
    assignments: protectedProcedure.query(({ ctx }) => listManagerChecklistAssignments(ctx.user)),
    review: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), propertyId: z.number().int().positive() })).query(({ ctx, input }) => getManagerChecklistReview(ctx.user, input)),
    save: protectedProcedure.input(checklistReviewInput).mutation(({ ctx, input }) => saveManagerChecklistReview(ctx.user, input)),
    submit: protectedProcedure.input(checklistReviewInput).mutation(({ ctx, input }) => submitManagerChecklistReview(ctx.user, input)),
  }),
});

export type AppRouter = typeof appRouter;
