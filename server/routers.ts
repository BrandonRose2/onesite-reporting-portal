import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createReportRequest,
  generateManagerChecklist,
  getDashboardOverview,
  getCatalogEntryById,
  getPropertyHistory,
  getRequestDetails,
  getManagerContactMatch,
  getRunnerSessionStatus,
  listCatalog,
  listReportLibraryRequests,
  listProperties,
  listRecentRequests,
  upsertCatalogEntry,
  upsertProperty,
} from "./db";
import { knownOperationalLimitations } from "./operationalLimitations";
import { catalogSaveSchema, propertySaveSchema, requestCreateSchema, runnerSourceSchema } from "./validation";
import { getCatalogParameterDefinitions, validateCatalogParameterValues } from "./reportParameters";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required for this operation." });
  return next();
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
    overview: protectedProcedure.query(() => getDashboardOverview()),
  }),

  properties: router({
    list: protectedProcedure.input(z.object({ includeInactive: z.boolean().optional() }).optional()).query(({ input }) => listProperties(input?.includeInactive ?? false)),
    details: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getPropertyHistory(input.id)),
    save: adminProcedure.input(propertySaveSchema).mutation(({ input }) => upsertProperty(input)),
  }),

  catalog: router({
    list: protectedProcedure.input(z.object({ includeInactive: z.boolean().optional(), source: runnerSourceSchema.optional() }).optional()).query(({ input }) => listCatalog(input?.includeInactive ?? false, input?.source)),
    save: adminProcedure.input(catalogSaveSchema).mutation(({ input }) => upsertCatalogEntry(input)),
  }),

  requests: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional(), source: runnerSourceSchema.optional() }).optional()).query(({ input }) => listRecentRequests(input?.limit ?? 25, input?.source)),
    library: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(250).optional(), source: runnerSourceSchema.optional() }).optional()).query(({ input }) => listReportLibraryRequests(input?.limit ?? 200, input?.source)),
    details: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const details = await getRequestDetails(input.id);
      if (!details) return undefined;
      const contactMatches = await Promise.all(details.properties.map(async property => ({ propertyName: property.name, ...(await getManagerContactMatch(property.name)) })));
      return { ...details, contactMatches };
    }),
    create: protectedProcedure.input(requestCreateSchema).mutation(async ({ ctx, input }) => {
      if (input.requestType === "sync_my_reports") return createReportRequest({ ...input, requestedById: ctx.user.id });
      const catalogEntry = await getCatalogEntryById(input.catalogId!);
      if (!catalogEntry || !catalogEntry.active || catalogEntry.source !== input.source) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an active report from the matching source catalog." });
      if (catalogEntry.exactReportName !== input.requestedReportName || !catalogEntry.availableFormats.includes(input.requestedFormat)) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected report title or format is not approved for this source." });
      const parameterErrors = validateCatalogParameterValues(getCatalogParameterDefinitions(catalogEntry.runnerMetadata), input.parameters);
      if (parameterErrors.length) throw new TRPCError({ code: "BAD_REQUEST", message: parameterErrors.join(" ") });
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
    generate: protectedProcedure.input(z.object({ requestId: z.number().int().positive(), propertyId: z.number().int().positive() })).query(({ input }) => generateManagerChecklist(input)),
  }),
});

export type AppRouter = typeof appRouter;
