import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";

const filename = process.argv[2] ?? "/home/ubuntu/delinquency-ingest/selected/1181003_Anaheim Gardens_Delinquent and Prepaid - Excel_1954125.xls";

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function amount(value: unknown) {
  const raw = String(value ?? "").replace(/[$,\s]/g, "");
  const parsed = Number.parseFloat(raw.replace(/[()]/g, ""));
  return Number.isFinite(parsed) ? (raw.includes("(") ? -parsed : parsed) : 0;
}

function rowsFor(sheet: XLSX.WorkSheet) {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerIndex = matrix.findIndex(row => row.map(normalize).includes("bldgunit") && row.map(normalize).includes("netbalance"));
  if (headerIndex < 0) return [];
  const headers = matrix[headerIndex].map(value => String(value));
  return matrix.slice(headerIndex + 1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

const workbook = XLSX.read(await readFile(filename), { type: "buffer", cellDates: false });
const summaries = workbook.SheetNames.map(sheetName => {
  const rows = rowsFor(workbook.Sheets[sheetName]);
  const residentRows = rows.filter(row => {
    const name = Object.entries(row).find(([key]) => normalize(key) === "name")?.[1];
    const unit = Object.entries(row).find(([key]) => normalize(key) === "bldgunit")?.[1];
    return String(name ?? "").trim() && String(unit ?? "").trim() && !/grand totals|subtotal|summary/i.test(String(name));
  });
  const get = (row: Record<string, unknown>, label: string) => Object.entries(row).find(([key]) => normalize(key) === normalize(label))?.[1];
  const uniqueResidents = new Set(residentRows.map(row => String(get(row, "Resh ID") || get(row, "Lease ID") || get(row, "Bldg/Unit"))));
  const sum = (label: string) => residentRows.reduce((total, row) => total + amount(get(row, label)), 0);
  return {
    sheetName,
    rowCount: residentRows.length,
    uniqueResidents: uniqueResidents.size,
    netBalance: sum("Net Balance"),
    totalPrepaid: sum("Total Prepaid"),
    totalDelinquent: sum("Total Delinquent"),
    current: sum("Current"),
    days30: sum("30 Days"),
    days60: sum("60 Days"),
    days90Plus: sum("90+ Days"),
  };
});

console.log(JSON.stringify({ filename: filename.split("/").pop(), summaries }, null, 2));
