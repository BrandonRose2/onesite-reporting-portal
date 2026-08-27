import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { renderWorkbookDataHtml } from "./workbookSummary";

describe("workbook data summary", () => {
  it("renders actual worksheet cells, sheet navigation, and escaped workbook values", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Resident", "Balance"], ["Avery & Co.", 125.5]]), "Delinquency");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xls" });
    const html = renderWorkbookDataHtml({ source: "onesite", requestId: 1, reportName: "Delinquent and Prepaid (Excel)", propertyNames: ["Boca Ciega Townhomes"], originalFilename: "source.xls", originalFileUrl: "/manus-storage/source.xls", workbookBytes: bytes, contactMatches: [{ propertyName: "Boca Ciega Townhomes", matchedRegion: "Region 1", propertyContacts: [{ managerName: "Property Lead", recordName: null, email: "lead@example.com", officePhone: "(555) 555-0100", mobilePhone: null, phoneExtension: "216" }], regionalContacts: [{ managerName: null, recordName: "Regional Lead - Regional Manager", email: "regional@example.com", officePhone: null, mobilePhone: "(555) 555-0200", phoneExtension: "301" }] }] });

    expect(html).toContain("Delinquency · 2 rows");
    expect(html).toContain("Avery &amp; Co.");
    expect(html).toContain("125.5");
    expect(html).toContain("Open preserved original workbook");
    expect(html).toContain("Property Lead");
    expect(html).toContain("Regional Lead");
    expect(html).toContain("ext. 216");
  });
});
