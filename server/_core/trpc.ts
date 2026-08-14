import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getPortalAccessForUser } from "../portalAccess";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requirePortalAccess = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  const portalAccess = await getPortalAccessForUser(ctx.user);
  if (!portalAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your Manus account is signed in, but it has not yet been approved for this reporting portal.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user, portalAccess } });
});

export const portalProcedure = t.procedure.use(requirePortalAccess);

export const portfolioProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    const portalAccess = await getPortalAccessForUser(ctx.user);
    if (!portalAccess || portalAccess.role === "manager") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Portfolio reporting access is required for this action." });
    }
    return next({ ctx: { ...ctx, user: ctx.user, portalAccess } });
  })
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
