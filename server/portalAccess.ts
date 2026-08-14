import { and, eq } from "drizzle-orm";
import type { User } from "../drizzle/schema";
import { portalAccessRules } from "../drizzle/schema";
import { getDb } from "./db";

export type PortalAccess = {
  role: "administrator" | "boss" | "manager";
  propertyIds: number[] | null;
};

function parsePropertyIds(value: string | null): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((id): id is number => Number.isInteger(id) && id > 0)));
  } catch {
    return [];
  }
}

export async function getPortalAccessForUser(user: User): Promise<PortalAccess | null> {
  if (user.role === "admin") return { role: "administrator", propertyIds: null };
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;
  const db = await getDb();
  if (!db) return null;
  const [rule] = await db
    .select()
    .from(portalAccessRules)
    .where(and(eq(portalAccessRules.email, email), eq(portalAccessRules.isActive, true)))
    .limit(1);
  if (!rule) return null;
  return {
    role: rule.role,
    propertyIds: rule.role === "boss" ? null : parsePropertyIds(rule.propertyIdsJson),
  };
}

export function canAccessProperty(access: PortalAccess, propertyId: number): boolean {
  return access.role !== "manager" || Boolean(access.propertyIds?.includes(propertyId));
}
