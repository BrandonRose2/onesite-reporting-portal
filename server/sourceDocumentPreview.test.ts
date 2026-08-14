import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("manager checklist source-document navigation", () => {
  it("opens source documents inside the authenticated portal rather than linking to the storage proxy", () => {
    const checklistPage = readFileSync(new URL("../client/src/pages/ManagerChecklistDetail.tsx", import.meta.url), "utf8");
    expect(checklistPage).toContain("/source-documents/${document.id}?period=${periodId}");
    expect(checklistPage).not.toContain("href={document.storageUrl}");
  });

  it("registers an approved-user source-document preview procedure", () => {
    const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    expect(routers).toContain("sourceDocumentPreview: portalProcedure");
    expect(routers).toContain("getSourceDocumentPreview(input, ctx.portalAccess.role === \"manager\"");
  });
});
