import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { reportCatalog } from "../drizzle/schema";
import { getDb } from "../server/db";
import { buildOneSiteCatalogSeeds, catalogFingerprint } from "../server/onesiteCatalog";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: pnpm tsx scripts/sync_onesite_catalog.ts <titles-file>");

const db = await getDb();
if (!db) throw new Error("The reporting database is unavailable.");
const reports = (await readFile(inputPath, "utf8")).split(/\r?\n/).flatMap(line => {
  const [title, reportArea, reportLevel, product] = line.split("\t");
  return title?.trim() ? [{ title, reportArea, reportLevel, product }] : [];
});
const seeds = buildOneSiteCatalogSeeds(reports);
let inserted = 0;
let updated = 0;
for (const seed of seeds) {
  const [existing] = await db.select().from(reportCatalog).where(eq(reportCatalog.slug, seed.slug));
  if (existing) {
    await db.update(reportCatalog).set({
      displayName: seed.displayName,
      exactReportName: seed.exactReportName,
      searchTerm: seed.searchTerm,
      defaultFormat: seed.defaultFormat,
      reportArea: seed.reportArea,
      reportLevel: seed.reportLevel,
      product: seed.product,
      description: existing.isVerified ? existing.description : seed.description,
      isActive: true,
    }).where(eq(reportCatalog.id, existing.id));
    updated += 1;
  } else {
    await db.insert(reportCatalog).values({ sourceSystem: "realpage", ...seed, isActive: true });
    inserted += 1;
  }
}
console.log(JSON.stringify({ catalogFingerprint: catalogFingerprint(reports), discoveredReports: seeds.length, inserted, updated }, null, 2));
