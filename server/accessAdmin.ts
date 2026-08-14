import { asc, eq } from "drizzle-orm";
import { portalAccessRules, properties } from "../drizzle/schema";
import { getDb } from "./db";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function listPortalAccessRules() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(portalAccessRules).orderBy(asc(portalAccessRules.email));
}

export async function listAccessAssignableProperties() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: properties.id, name: properties.name, region: properties.region })
    .from(properties)
    .where(eq(properties.isActive, true))
    .orderBy(asc(properties.name));
}

export async function savePortalAccessRule(input: {
  email: string;
  role: "boss" | "manager";
  propertyIds: number[];
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const email = normalizeEmail(input.email);
  const propertyIds = input.role === "manager" ? Array.from(new Set(input.propertyIds)).sort((a, b) => a - b) : [];
  await db
    .insert(portalAccessRules)
    .values({
      email,
      role: input.role,
      propertyIdsJson: input.role === "manager" ? JSON.stringify(propertyIds) : null,
      isActive: true,
      createdByUserId: input.createdByUserId,
    })
    .onDuplicateKeyUpdate({
      set: {
        role: input.role,
        propertyIdsJson: input.role === "manager" ? JSON.stringify(propertyIds) : null,
        isActive: true,
        createdByUserId: input.createdByUserId,
      },
    });
  return { email, role: input.role, propertyIds };
}

export async function setPortalAccessRuleActive(input: { id: number; isActive: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(portalAccessRules).set({ isActive: input.isActive }).where(eq(portalAccessRules.id, input.id));
  return { success: true };
}
