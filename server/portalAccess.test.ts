import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("approved portal access controls", () => {
  it("defines boss and property-scoped manager access rules", () => {
    const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
    expect(schema).toContain('"portalAccessRules"');
    expect(schema).toContain('["boss", "manager"]');
    expect(schema).toContain('propertyIdsJson');
  });

  it("exposes administrator-only access management procedures", () => {
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(routerSource).toContain("access: router");
    expect(routerSource).toContain("saveRule: adminProcedure");
    expect(routerSource).toContain("setActive: adminProcedure");
  });

  it("registers a dedicated administrator access screen", () => {
    const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const layoutSource = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(appSource).toContain('path={"/access"}');
    expect(layoutSource).toContain('label: "Portal Access"');
    expect(layoutSource).toContain("adminOnly: true");
  });

  it("protects unapproved accounts and limits manager navigation to assigned checklist work", () => {
    const layoutSource = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(layoutSource).toContain("Access approval required");
    expect(layoutSource).toContain("portalAccessQuery.data.role");
    expect(layoutSource).toContain('accessRole !== "manager" || item.managerAllowed');
    expect(layoutSource).toContain('setLocation("/manager-checklists")');
  });

  it("uses property scope for manager dashboard and contact data", () => {
    const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const dashboardSource = readFileSync(new URL("./delinquency.ts", import.meta.url), "utf8");
    const contactSource = readFileSync(new URL("./onesiteReporting.ts", import.meta.url), "utf8");
    expect(routerSource).toContain("managerDashboard: portalProcedure");
    expect(routerSource).toContain("canAccessProperty(ctx.portalAccess, input.propertyId)");
    expect(dashboardSource).toContain("propertyIds?: number[]");
    expect(contactSource).toContain("listOneSitePropertyContacts(propertyIds?: number[])");
  });
});
