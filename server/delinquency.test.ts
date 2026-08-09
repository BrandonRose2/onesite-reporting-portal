import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { DEFAULT_REALPAGE_CRON } from "./automation";
import { parseDelinquencyWorkbook } from "./delinquency";

describe("parseDelinquencyWorkbook", () => {
  it("reads resident detail, aging, financial, and collection-note fields from the selected export", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([
      {
        "Resh ID": "1001",
        "Lease ID": "2001",
        "Bldg/Unit": "100 - 100",
        Name: "Doe, Jane",
        "Phone Number": "555-0100",
        Email: "jane@example.test",
        Status: "Current resident",
        "Move-In/Out": "01/10/2026",
        Code: "RENT",
        Description: "Rent charge",
        "Total Prepaid": "($10.00)",
        "Total Delinquent": "$300.00",
        "Net Balance": "$290.00",
        Current: "$100.00",
        "30 Days": "$90.00",
        "60 Days": "$60.00",
        "90+": "$40.00",
        "# Late": "1",
        "# NSF": "2",
        "DEL Comment": "Contacted resident",
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resident Detail");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xls" });

    const rows = parseDelinquencyWorkbook(buffer);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      residentKey: "1001",
      unit: "100 - 100",
      residentName: "Doe, Jane",
      transactionCode: "RENT",
      totalPrepaid: -10,
      totalDelinquent: 300,
      netBalance: 290,
      currentAmount: 100,
      days30Amount: 90,
      days60Amount: 60,
      days90PlusAmount: 40,
      lateCount: 1,
      nsfCount: 2,
      collectionNotes: "Contacted resident",
    });
  });

  it("ignores summary rows that do not represent resident ledger detail", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([
      { "Bldg/Unit": "100", Name: "Grand Totals", "Net Balance": "$10.00" },
      { "Bldg/Unit": "101", Name: "Doe, John", "Net Balance": "$10.00" },
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resident Detail");

    expect(parseDelinquencyWorkbook(XLSX.write(workbook, { type: "buffer", bookType: "xls" }))).toHaveLength(1);
  });

  it("finds the report header after RealPage-style report title rows", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Property Name\nDELINQUENT AND PREPAID\nFISCAL PERIOD 042026"],
      ["Resh ID", "Bldg/Unit", "Name", "Code Description", "Total Prepaid", "Total Delinquent", "Net Balance", "Current", "30 Days", "60 Days", "90+ Days"],
      ["101", "1-101", "Resident, Example", "RENT - Monthly", "$0.00", "$200.00", "$200.00", "$100.00", "$50.00", "$25.00", "$25.00"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const rows = parseDelinquencyWorkbook(XLSX.write(workbook, { type: "buffer", bookType: "xls" }));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ residentKey: "101", unit: "1-101", netBalance: 200, days90PlusAmount: 25 });
  });

  it("accepts an empty RealPage detail report as a valid zero-row property export", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Property Name\nDELINQUENT AND PREPAID"],
      ["Resh ID", "Bldg/Unit", "Name", "Net Balance", "Current", "30 Days", "60 Days", "90+ Days"],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    expect(parseDelinquencyWorkbook(XLSX.write(workbook, { type: "buffer", bookType: "xls" }))).toEqual([]);
  });
});

describe("scheduled RealPage defaults", () => {
  it("uses a six-field weekly Monday cron expression", () => {
    expect(DEFAULT_REALPAGE_CRON.split(/\s+/)).toHaveLength(6);
    expect(DEFAULT_REALPAGE_CRON).toBe("0 0 15 * * 1");
  });
});
