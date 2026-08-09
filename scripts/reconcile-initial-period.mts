import { count, eq } from "drizzle-orm";
import { propertyPeriodSummaries, residentLedgerRows, sourceFiles } from "../drizzle/schema";
import { getDashboard } from "../server/delinquency";
import { getDb } from "../server/db";

const REPORTING_PERIOD_ID = 60001;

async function main() {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const dashboard = await getDashboard(REPORTING_PERIOD_ID);
  const [[sourceCount], [summaryCount], [ledgerCount]] = await Promise.all([
    db.select({ count: count() }).from(sourceFiles).where(eq(sourceFiles.reportingPeriodId, REPORTING_PERIOD_ID)),
    db.select({ count: count() }).from(propertyPeriodSummaries).where(eq(propertyPeriodSummaries.reportingPeriodId, REPORTING_PERIOD_ID)),
    db.select({ count: count() }).from(residentLedgerRows).where(eq(residentLedgerRows.reportingPeriodId, REPORTING_PERIOD_ID)),
  ]);

  console.log(JSON.stringify({
    reportingPeriod: dashboard.period ? {
      id: dashboard.period.id,
      name: dashboard.period.name,
      fiscalPeriod: dashboard.period.fiscalPeriod,
      asOfDate: dashboard.period.asOfDate,
      status: dashboard.period.status,
    } : null,
    sourceFileCount: sourceCount?.count ?? 0,
    propertySummaryCount: summaryCount?.count ?? 0,
    residentLedgerRowCount: ledgerCount?.count ?? 0,
    portfolioMetrics: dashboard.metrics,
    regions: dashboard.regions.map(region => ({
      region: region.region,
      propertyCount: region.properties.length,
      netBalance: region.metrics.netBalance,
      days90PlusAmount: region.metrics.days90PlusAmount,
    })),
  }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
