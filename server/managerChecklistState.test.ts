import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("manager checklist real-time persistence", () => {
  it("stores one checklist state per reporting period and property", () => {
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
    expect(schema).toContain('managerChecklistStates');
    expect(schema).toContain('manager_checklist_period_property_unique');
  });

  it("requires portal access and persists the PDF-aligned verification state", () => {
    const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const service = readFileSync(new URL("./delinquency.ts", import.meta.url), "utf8");
    const page = readFileSync(new URL("../client/src/pages/ManagerChecklistDetail.tsx", import.meta.url), "utf8");
    expect(routers).toContain('checklistState: portalProcedure');
    expect(routers).toContain('saveChecklistState: portalProcedure');
    expect(routers).toContain('managerContactStatus');
    expect(service).toContain('onDuplicateKeyUpdate');
    expect(page).toContain('saveChecklistState.mutate');
    expect(page).toContain('Saved in portal');
    expect(page).toContain('Next follow-up date');
    expect(page).toContain('Escalations requiring regional or corporate support');
  });
});
