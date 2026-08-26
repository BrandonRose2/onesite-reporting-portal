import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createReportRequest,
  getDashboardOverview,
  getPropertyHistory,
  getRequestDetails,
  getOperationalConfig,
  listCatalog,
  listProperties,
  listRecentRequests,
  upsertCatalogEntry,
  upsertProperty,
} from "./db";
import { knownOperationalLimitations } from "./operationalLimitations";
import { catalogSaveSchema, propertySaveSchema, requestCreateSchema } from "./validation";

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
    list: protectedProcedure.input(z.object({ includeInactive: z.boolean().optional() }).optional()).query(({ input }) => listCatalog(input?.includeInactive ?? false)),
    save: adminProcedure.input(catalogSaveSchema).mutation(({ input }) => upsertCatalogEntry(input)),
  }),

  requests: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional()).query(({ input }) => listRecentRequests(input?.limit ?? 25)),
    details: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getRequestDetails(input.id)),
    create: protectedProcedure.input(requestCreateSchema).mutation(({ ctx, input }) => createReportRequest({ ...input, requestedById: ctx.user.id })),
  }),

  operations: router({
    recoveryStatus: protectedProcedure.query(async () => {
      const liveEdge = await getOperationalConfig("live_edge_status");
      return {
        liveEdge: liveEdge?.configValue ? JSON.parse(liveEdge.configValue) : { status: "unavailable", detail: "The runner has not reported a live Edge session yet." },
        limitations: knownOperationalLimitations,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
