import { afterEach, describe, expect, it } from "vitest";
import { properties, reportCatalog } from "../drizzle/schema";
import { setDbClientForTesting, upsertCatalogEntry, upsertProperty } from "./db";

function withoutUndefined<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

function createPersistenceDouble() {
  const property = {
    id: 9, source: "onesite" as const, externalId: "prop-09", name: "Northpoint", market: "Austin", managerName: "Avery", managerEmail: "avery@example.com", active: true,
    createdAt: new Date("2026-08-01T00:00:00Z"), updatedAt: new Date("2026-08-01T00:00:00Z"),
  };
  const catalog = {
    id: 14, catalogKey: "delinquency", exactReportName: "Delinquency", reportArea: "Operations", reportLevel: null, product: "OneSite", availableFormats: ["excel"], runnerMetadata: { mode: "current" }, active: true,
    createdAt: new Date("2026-08-01T00:00:00Z"), updatedAt: new Date("2026-08-01T00:00:00Z"),
  };
  const db = {
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          if (table === properties) Object.assign(property, withoutUndefined(values));
          if (table === reportCatalog) Object.assign(catalog, withoutUndefined(values));
          return [{ affectedRows: 1 }];
        },
      }),
    }),
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({ limit: async () => table === properties ? [property] : [catalog] }),
      }),
    }),
  };
  return { db, property, catalog };
}

afterEach(() => setDbClientForTesting(null));

describe("portal persistence update contracts", () => {
  it("persists a property edit and active-status change through the data layer", async () => {
    const { db, property } = createPersistenceDouble();
    setDbClientForTesting(db as never);
    const result = await upsertProperty({ id: 9, externalId: "prop-09", name: "Northpoint", market: "Austin", managerName: "Avery", managerEmail: "avery@example.com", active: false });
    expect(property.active).toBe(false);
    expect(result).toMatchObject({ id: 9, active: false, externalId: "prop-09" });
  });

  it("persists edited runner metadata and active status through the catalog data layer", async () => {
    const { db, catalog } = createPersistenceDouble();
    setDbClientForTesting(db as never);
    const result = await upsertCatalogEntry({ id: 14, catalogKey: "delinquency", exactReportName: "Delinquency - Revised", reportArea: "Operations", reportLevel: null, product: "OneSite", availableFormats: ["excel", "pdf"], runnerMetadata: { mode: "revised", includeClosed: false }, active: false });
    expect(catalog).toMatchObject({ exactReportName: "Delinquency - Revised", active: false, runnerMetadata: { mode: "revised", includeClosed: false } });
    expect(result).toMatchObject({ id: 14, active: false, availableFormats: ["excel", "pdf"] });
  });
});
