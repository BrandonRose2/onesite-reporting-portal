import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { renderWorkbookDataHtml } from "./workbookSummary";

describe("workbook data summary", () => {
  it("renders actual worksheet cells, sheet navigation, and escaped workbook values", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Resident", "Balance"], ["Avery & Co.", 125.5]]), "Delinquency");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xls" });
    const html = renderWorkbookDataHtml({ source: "onesite", requestId: 1, reportName: "Delinquent and Prepaid (Excel)", propertyNames: ["Boca Ciega Townhomes"], originalFilename: "source.xls", originalFileUrl: "/manus-storage/source.xls", workbookBytes: bytes });

    expect(html).toContain("Delinquency · 2 rows");
    expect(html).toContain("Avery &amp; Co.");
    expect(html).toContain("125.5");
    expect(html).toContain("Open preserved original workbook");
  });
});
