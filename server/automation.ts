import { and, desc, eq } from "drizzle-orm";
import { retrievalAutomations, scrapeRuns } from "../drizzle/schema";
import { getDb } from "./db";

export type AutomationParameters = {
  delinquencyReportName: string;
  delinquencyFormat: "excel";
  includeAvailabilityPdf: boolean;
  includePrepaids: boolean;
  includeZeroBalance: boolean;
  propertyScope: "mapped_realpage";
};

const DEFAULT_PARAMETERS: AutomationParameters = {
  delinquencyReportName: "Delinquent and Prepaid (Excel)",
  delinquencyFormat: "excel",
  includeAvailabilityPdf: true,
  includePrepaids: true,
  includeZeroBalance: false,
  propertyScope: "mapped_realpage",
};

export const DEFAULT_REALPAGE_CRON = "0 0 15 * * 1";

function parseParameters(value: string | null): AutomationParameters {
  try {
    const parsed = value ? JSON.parse(value) : {};
    return { ...DEFAULT_PARAMETERS, ...parsed };
  } catch {
    return DEFAULT_PARAMETERS;
  }
}

function validateCron(cron: string) {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 6) throw new Error("Use a six-field UTC cron expression: second minute hour day-of-month month day-of-week.");
}

export async function getRealPageAutomation() {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const [automation] = await db.select().from(retrievalAutomations)
    .where(eq(retrievalAutomations.sourceSystem, "realpage"))
    .limit(1);
  if (!automation) {
    return {
      id: null,
      name: "RealPage / OneSite Delinquency Retrieval",
      sourceSystem: "realpage" as const,
      sourceUrl: "https://www.realpage.com/reporting/reports",
      isEnabled: false,
      scheduleCronTaskUid: null,
      cronExpression: DEFAULT_REALPAGE_CRON,
      timezone: "America/Los_Angeles",
      parameters: DEFAULT_PARAMETERS,
      lastSuccessfulRunAt: null,
    };
  }
  return { ...automation, parameters: parseParameters(automation.parametersJson) };
}

export async function saveRealPageAutomation(input: {
  cronExpression: string;
  timezone: string;
  parameters: AutomationParameters;
  isEnabled: boolean;
}) {
  validateCron(input.cronExpression);
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const values = {
    sourceSystem: "realpage" as const,
    name: "RealPage / OneSite Delinquency Retrieval",
    sourceUrl: "https://www.realpage.com/reporting/reports",
    cronExpression: input.cronExpression.trim(),
    timezone: input.timezone,
    parametersJson: JSON.stringify(input.parameters),
    isEnabled: input.isEnabled,
  };
  await db.insert(retrievalAutomations).values(values).onDuplicateKeyUpdate({ set: values });
  return getRealPageAutomation();
}

export async function queueRealPageRun(trigger: "manual" | "scheduled") {
  const db = await getDb();
  if (!db) throw new Error("The reporting database is unavailable.");
  const [automation] = await db.select().from(retrievalAutomations)
    .where(eq(retrievalAutomations.sourceSystem, "realpage"))
    .limit(1);
  if (!automation) throw new Error("Save the RealPage automation settings before starting a run.");
  const [activeRun] = await db.select().from(scrapeRuns)
    .where(and(eq(scrapeRuns.sourceSystem, "realpage"), eq(scrapeRuns.status, "running")))
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(1);
  if (activeRun) return activeRun;
  const result = await db.insert(scrapeRuns).values({
    retrievalAutomationId: automation.id,
    sourceSystem: "realpage",
    trigger,
    status: "queued",
    validationSummary: `Queued with parameters: ${automation.parametersJson ?? JSON.stringify(DEFAULT_PARAMETERS)}`,
  });
  const [run] = await db.select().from(scrapeRuns).where(eq(scrapeRuns.id, Number(result[0].insertId))).limit(1);
  return run;
}

export async function listRealPageRuns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scrapeRuns)
    .where(eq(scrapeRuns.sourceSystem, "realpage"))
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(25);
}
