import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseDelinquencyWorkbook, type ParsedLedgerRow } from "../server/delinquency";

const SOURCE_ROOT = "/home/ubuntu/checklist-source/DELINQUENCY_REPORT_1954167";
const OUTPUT_ROOT = "/home/ubuntu/manager-checklists";

type ResidentBalance = {
  residentKey: string;
  unit: string;
  residentName: string;
  status: string;
  prepaid: number;
  delinquent: number;
  netBalance: number;
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  lateCount: number;
  nsfCount: number;
  notes: string;
};

type AvailabilityEntry = {
  unit: string;
  floorPlan: string;
  classification: string;
};

function dollars(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function cell(value: string | number | null | undefined) {
  return String(value ?? "—").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim() || "—";
}

function statusFor(row: ResidentBalance) {
  if (row.netBalance > 0.005) return "Owes balance";
  if (row.netBalance < -0.005 || row.prepaid < -0.005) return "Prepaid / credit";
  return "Paid / zero balance";
}

function creditAmount(row: ResidentBalance) {
  return Math.max(-row.netBalance, -row.prepaid, 0);
}

function aggregateRows(rows: ParsedLedgerRow[]) {
  const grouped = new Map<string, ResidentBalance>();
  for (const row of rows) {
    const prior = grouped.get(row.residentKey) ?? {
      residentKey: row.residentKey,
      unit: row.unit ?? "Unassigned",
      residentName: row.residentName ?? "Resident name unavailable",
      status: row.residentStatus ?? "Not stated",
      prepaid: 0,
      delinquent: 0,
      netBalance: 0,
      current: 0,
      days30: 0,
      days60: 0,
      days90Plus: 0,
      lateCount: 0,
      nsfCount: 0,
      notes: "",
    };
    prior.prepaid += row.totalPrepaid;
    prior.delinquent += row.totalDelinquent;
    prior.netBalance += row.netBalance;
    prior.current += row.currentAmount;
    prior.days30 += row.days30Amount;
    prior.days60 += row.days60Amount;
    prior.days90Plus += row.days90PlusAmount;
    prior.lateCount += row.lateCount;
    prior.nsfCount += row.nsfCount;
    if (row.collectionNotes && !prior.notes.includes(row.collectionNotes)) {
      prior.notes = prior.notes ? `${prior.notes}; ${row.collectionNotes}` : row.collectionNotes;
    }
    grouped.set(row.residentKey, prior);
  }
  return [...grouped.values()].sort((left, right) => left.unit.localeCompare(right.unit) || left.residentName.localeCompare(right.residentName));
}

function totals(rows: ParsedLedgerRow[]) {
  return rows.reduce(
    (accumulator, row) => ({
      rows: accumulator.rows + 1,
      prepaid: accumulator.prepaid + row.totalPrepaid,
      delinquent: accumulator.delinquent + row.totalDelinquent,
      netBalance: accumulator.netBalance + row.netBalance,
    }),
    { rows: 0, prepaid: 0, delinquent: 0, netBalance: 0 }
  );
}

function availabilityFromPdf(pdfPath: string) {
  const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const asOfDate = text.match(/As of\s+(\d{2}\/\d{2}\/\d{4})/)?.[1] ?? "Not stated";
  const detail = text.split(/\bDETAIL\b/)[1]?.split(/\bSUMMARY \(all statuses\)/)[0] ?? "";
  const entries: AvailabilityEntry[] = [];
  let classification = "Reported availability / non-revenue status";

  for (const sourceLine of detail.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || /^Bldg\/|^Unit\b|^Floor\b|^Curr\/|^no amenities|^\*\s*-/.test(line)) continue;
    const groupMatch = line.match(/^(.+?)\s+\((\d+)\)$/);
    if (groupMatch && !/^\d/.test(groupMatch[1])) {
      classification = groupMatch[1];
      continue;
    }
    const unitMatch = line.match(/^([A-Za-z0-9-]+)\s+([A-Za-z0-9]+)\s+[\d,]+(?:\.\d+)?\b/);
    if (unitMatch) {
      entries.push({ unit: unitMatch[1], floorPlan: unitMatch[2], classification });
    }
  }
  return { asOfDate, entries, sourceHash: createHash("sha256").update(text).digest("hex").slice(0, 12) };
}

function residentTable(rows: ResidentBalance[]) {
  if (!rows.length) return "No resident ledger entries were detected in the selected source export.\n";
  const header = "| Unit | Resident | Ledger status | Prepaid / credit | Owed | 90+ days | Manager follow-up | Notes |\n|---|---|---|---:|---:|---:|---|---|";
  const body = rows.map(row => {
    const defaultAction = row.netBalance > 0.005 ? "[ ] Contacted  [ ] Arrangement  [ ] Escalate" : row.prepaid > 0.005 ? "[ ] Credit verified" : "[ ] Confirm paid";
    return `| ${cell(row.unit)} | ${cell(row.residentName)} | ${cell(statusFor(row))} | ${dollars(creditAmount(row))} | ${dollars(Math.max(row.netBalance, 0))} | ${dollars(row.days90Plus)} | ${defaultAction} | ${cell(row.notes)} |`;
  });
  return `${header}\n${body.join("\n")}\n`;
}

function availabilityTable(entries: AvailabilityEntry[]) {
  if (!entries.length) return "No unit-level availability detail could be machine-read from this PDF. Please confirm the Availability source report during the manager call.\n";
  const header = "| Unit | Floor plan | Reported status | Manager verification | Follow-up / target date |\n|---|---|---|---|---|";
  const body = entries.map(entry => `| ${cell(entry.unit)} | ${cell(entry.floorPlan)} | ${cell(entry.classification)} | [ ] Verified | __________________ |`);
  return `${header}\n${body.join("\n")}\n`;
}

function checklistMarkdown(input: {
  propertyId: string;
  propertyName: string;
  sourceFiles: string[];
  availabilityFile: string;
  availabilityAsOf: string;
  availabilityEntries: AvailabilityEntry[];
  primaryTotals: ReturnType<typeof totals>;
  companionTotals: ReturnType<typeof totals> | null;
  residents: ResidentBalance[];
}) {
  const owing = input.residents.filter(row => row.netBalance > 0.005);
  const prepaid = input.residents.filter(row => row.netBalance < -0.005 || row.prepaid < -0.005);
  const paid = input.residents.filter(row => Math.abs(row.netBalance) <= 0.005 && Math.abs(row.prepaid) <= 0.005);
  const companionStatus = input.companionTotals
    ? Math.abs(input.primaryTotals.netBalance - input.companionTotals.netBalance) < 0.01 && input.primaryTotals.rows === input.companionTotals.rows
      ? "Matched primary export on row count and net balance"
      : `Review variance: ${input.primaryTotals.rows} vs. ${input.companionTotals.rows} rows; ${dollars(input.primaryTotals.netBalance - input.companionTotals.netBalance)} net-balance difference`
    : "No companion spreadsheet available for comparison";

  return `# ${input.propertyName} — Manager Delinquency & Availability Checklist

> **Confidential manager working document.** This checklist cross-references the delinquency ledger and Availability report provided for **Property ID ${input.propertyId}**. Update the checkboxes and notes during or immediately after the manager call.

| Call details | Manager update |
|---|---|
| Availability report as of | ${input.availabilityAsOf} |
| Manager contacted | [ ] Yes  [ ] Voicemail  [ ] Follow-up required |
| Manager name | ______________________________ |
| Call date / time | ______________________________ |
| Next commitment date | ______________________________ |

## Source Cross-Reference

| Source / validation | Result |
|---|---|
| Availability PDF | \`${input.availabilityFile}\` |
| Delinquency spreadsheet(s) | ${input.sourceFiles.map(file => `\`${file}\``).join("<br>")} |
| Spreadsheet comparison | ${companionStatus} |
| Ledger accounts for review | ${input.residents.length} resident accounts |
| Residents with amount owed | ${owing.length} accounts; ${dollars(owing.reduce((sum, row) => sum + Math.max(row.netBalance, 0), 0))} |
| Prepaid / credit accounts | ${prepaid.length} accounts; ${dollars(prepaid.reduce((sum, row) => sum + creditAmount(row), 0))} |
| Availability entries | ${input.availabilityEntries.length} unit-status entries |

## Availability Follow-Up

- [ ] Confirm each listed unit’s reported status remains accurate today.
- [ ] Confirm ready / not-ready condition, make-ready scope, and target availability date.
- [ ] Confirm leasing, prelease, or move-in commitment where applicable.
- [ ] Escalate any vacancy or non-revenue status lacking a committed action and date.

${availabilityTable(input.availabilityEntries)}

## Resident Balance Follow-Up — Amount Owed

> **Priority:** Confirm contact, payment status, payment arrangement, and escalation needs for every account with a positive current net balance.

${residentTable(owing)}

## Resident Balance Follow-Up — Prepaid / Credit

${residentTable(prepaid)}

## Resident Balance Follow-Up — Paid / Zero Balance

${residentTable(paid)}

## Manager Summary & Commitments

- **Availability status / blockers:**
  - [ ] Reviewed with manager
  - Notes: ____________________________________________________________________________

- **Delinquency commitments / payment arrangements:**
  - [ ] Reviewed with manager
  - Notes: ____________________________________________________________________________

- **Escalations requiring regional or corporate support:**
  - [ ] None
  - [ ] Escalation required: ___________________________________________________________

- **Next manager follow-up date:** ______________________________

---

*Generated from the property’s supplied Availability PDF and Delinquent and Prepaid spreadsheet(s). The manager must validate current operational status before acting on any resident account.*
`;
}

async function main() {
  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const directories = (await readdir(SOURCE_ROOT, { withFileTypes: true })).filter(entry => entry.isDirectory() && /^\d+\s+-\s+/.test(entry.name)).map(entry => entry.name).sort();
  const manifest: string[] = ["# Manager Checklist Package", "", "| Property | Checklist | Availability report | Delinquency exports |", "|---|---|---|---|"];

  for (const directory of directories) {
    const [propertyId, propertyName] = directory.split(/\s+-\s+/, 2);
    const propertyPath = path.join(SOURCE_ROOT, directory);
    const files = (await readdir(propertyPath)).filter(file => /\.(pdf|xls|xlsx)$/i.test(file));
    const availability = files.find(file => /_availability_/i.test(file));
    const spreadsheets = files.filter(file => /delinquent and prepaid/i.test(file) && /\.xls(x)?$/i.test(file));
    const primary = spreadsheets.find(file => /delinquent and prepaid - excel/i.test(file)) ?? spreadsheets[0];
    const companion = spreadsheets.find(file => file !== primary);
    if (!availability || !primary) throw new Error(`${directory} is missing its Availability PDF or Delinquent and Prepaid export.`);

    const primaryRows = parseDelinquencyWorkbook(await readFile(path.join(propertyPath, primary)));
    const companionRows = companion ? parseDelinquencyWorkbook(await readFile(path.join(propertyPath, companion))) : [];
    const availabilityData = availabilityFromPdf(path.join(propertyPath, availability));
    const residents = aggregateRows(primaryRows);
    const filename = `${propertyId}_${propertyName.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}_Manager_Checklist.md`;
    await writeFile(path.join(OUTPUT_ROOT, filename), checklistMarkdown({
      propertyId,
      propertyName,
      sourceFiles: spreadsheets,
      availabilityFile: availability,
      availabilityAsOf: availabilityData.asOfDate,
      availabilityEntries: availabilityData.entries,
      primaryTotals: totals(primaryRows),
      companionTotals: companion ? totals(companionRows) : null,
      residents,
    }));
    manifest.push(`| ${propertyName} | [Open checklist](./${filename}) | \`${availability}\` | ${spreadsheets.length} cross-referenced exports |`);
  }

  await writeFile(path.join(OUTPUT_ROOT, "README.md"), `${manifest.join("\n")}\n`);
  console.log(`Generated ${directories.length} manager checklists in ${OUTPUT_ROOT}`);
}

await main();
