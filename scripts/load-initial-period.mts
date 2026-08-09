import { readFile, readdir } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { importDelinquencyBatch } from "../server/delinquency";
import { getDb } from "../server/db";

const SOURCE_DIRECTORY = "/home/ubuntu/delinquency-ingest/selected";

async function main() {
  const filenames = (await readdir(SOURCE_DIRECTORY))
    .filter(filename => /Delinquent and Prepaid - Excel_.*\.xls$/i.test(filename))
    .sort();

  if (filenames.length !== 35) {
    throw new Error(`Expected 35 canonical XLS exports; found ${filenames.length}.`);
  }

  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
  if (!admin) throw new Error("No administrator account is available to attribute this import.");

  const files = await Promise.all(
    filenames.map(async filename => ({
      filename,
      dataBase64: (await readFile(`${SOURCE_DIRECTORY}/${filename}`)).toString("base64"),
    })),
  );

  const result = await importDelinquencyBatch({
    name: "Fiscal Period 04/2026 · 08/05/2026",
    fiscalPeriod: "04/2026",
    asOfDate: "2026-08-05",
    files,
    importedByUserId: admin.id,
  });

  console.log(JSON.stringify({ status: "imported", ...result, sourceFileNames: filenames }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
