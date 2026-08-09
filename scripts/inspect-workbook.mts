import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";

const filename = process.argv[2] ?? "/home/ubuntu/delinquency-ingest/selected/1181003_Anaheim Gardens_Delinquent and Prepaid - Excel_1954125.xls";
const workbook = XLSX.read(await readFile(filename), { type: "buffer", cellDates: false });

console.log(JSON.stringify({
  sheetNames: workbook.SheetNames,
  sheets: workbook.SheetNames.map(sheetName => {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false });
    const headerCandidates = matrix.flatMap((row, index) => {
      const values = row.map(value => String(value).trim());
      const headerSignals = values.filter(value => /^(unit|name|status|code|description|current|30|60|90|prepaid|delinquent|net balance|move-in\/out|late|nsf)$/i.test(value));
      return headerSignals.length >= 4 ? [{ rowNumber: index + 1, headerSignals: values.filter(Boolean) }] : [];
    });
    return {
      sheetName,
      rowCount: matrix.length,
      headerCandidates,
    };
  }),
}, null, 2));
