import * as XLSX from "xlsx";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function sheetAnchor(name: string, index: number) {
  return `sheet-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "worksheet"}`;
}

type ReportContact = { managerName: string | null; recordName: string | null; email: string | null; officePhone: string | null; mobilePhone: string | null; phoneExtension: string | null };
type ReportContactMatch = { propertyName: string; matchedRegion: string | null; propertyContacts: ReportContact[]; regionalContacts: ReportContact[] };

function renderContactCard(contact: ReportContact, role: string) {
  const name = contact.managerName ?? contact.recordName?.replace(/\s*-\s*regional manager\s*$/i, "") ?? "Unassigned contact";
  const contactLines = [
    contact.officePhone ? `<a href="tel:${escapeHtml(contact.officePhone.replace(/[^+\d]/g, ""))}">Office: ${escapeHtml(contact.officePhone)}${contact.phoneExtension ? ` ext. ${escapeHtml(contact.phoneExtension)}` : ""}</a>` : null,
    contact.mobilePhone ? `<a href="tel:${escapeHtml(contact.mobilePhone.replace(/[^+\d]/g, ""))}">Mobile: ${escapeHtml(contact.mobilePhone)}</a>` : null,
    contact.email ? `<a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : null,
  ].filter(Boolean).join("");
  return `<article class="contact-card"><p class="contact-role">${escapeHtml(role)}</p><h3>${escapeHtml(name)}</h3><div class="contact-lines">${contactLines || "<span>No contact fields are available.</span>"}</div></article>`;
}

function renderContacts(matches: ReportContactMatch[]) {
  const cards = matches.flatMap(match => [
    ...match.propertyContacts.map(contact => renderContactCard(contact, `Property manager · ${match.propertyName}`)),
    ...match.regionalContacts.map(contact => renderContactCard(contact, `Regional manager · ${match.matchedRegion ?? "Assigned region"}`)),
  ]);
  return cards.length ? `<section class="contacts"><header><p class="eyebrow">Manager contacts</p><h2>Property and regional contacts</h2><p>Matched from the authorized Company Contacts directory.</p></header><div class="contact-grid">${cards.join("")}</div></section>` : "";
}

export function renderWorkbookDataHtml(input: { source: "onesite" | "yardi"; requestId: number; reportName: string; propertyNames: string[]; originalFilename: string; originalFileUrl: string; workbookBytes: ArrayBuffer | Uint8Array; contactMatches?: ReportContactMatch[] }) {
  const workbook = XLSX.read(input.workbookBytes, { type: "array", cellDates: true, raw: true });
  const sheets = workbook.SheetNames.map((name, sheetIndex) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: "", raw: false });
    const columnCount = Math.max(1, ...rows.map(row => row.length));
    const anchor = sheetAnchor(name, sheetIndex);
    const rowHtml = rows.length
      ? rows.map((row, rowIndex) => `<tr><th scope="row">${rowIndex + 1}</th>${Array.from({ length: columnCount }, (_, columnIndex) => `<td>${escapeHtml(row[columnIndex])}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${columnCount + 1}" class="empty">This worksheet has no displayable cells.</td></tr>`;
    return { name, anchor, rowCount: rows.length, columnCount, html: `<section id="${anchor}" class="sheet"><header class="sheet-header"><div><p class="eyebrow">Worksheet ${sheetIndex + 1}</p><h2>${escapeHtml(name)}</h2></div><p class="sheet-meta">${rows.length.toLocaleString()} rows · ${columnCount} columns</p></header><div class="table-wrap"><table><tbody>${rowHtml}</tbody></table></div></section>` };
  });
  const sourceName = input.source === "onesite" ? "OneSite" : "Yardi";
  const propertyLabel = input.propertyNames.length ? input.propertyNames.join(", ") : "Portfolio request";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(input.reportName)} — workbook data</title><style>:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f6fb;color:#15253d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.page{max-width:1440px;margin:auto;padding:32px 20px 56px}.hero{background:linear-gradient(120deg,#0a4f4a,#10284a);border-radius:24px;padding:28px;color:#fff;box-shadow:0 20px 42px -30px rgba(10,40,74,.75)}.eyebrow{margin:0;color:#7ee0cd;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.hero h1{margin:8px 0 0;font-size:clamp(24px,4vw,36px);line-height:1.15}.hero p:last-child{margin:10px 0 0;color:#d6e7f0;font-size:14px}.meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.meta-card,.contact-card{background:#fff;border:1px solid #e3e9f1;border-radius:14px;padding:14px;box-shadow:0 10px 24px -24px rgba(15,35,67,.6)}.meta-card span{display:block;color:#62748b;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.meta-card strong{display:block;margin-top:6px;font-size:14px;overflow-wrap:anywhere}.contacts{margin:18px 0;background:#eefaf7;border:1px solid #c8ece2;border-radius:18px;padding:20px}.contacts header h2{margin:5px 0 0;font-size:19px}.contacts header>p:last-child{margin:7px 0 0;color:#4c6d68;font-size:12px}.contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:14px}.contact-role{margin:0;color:#087365;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.contact-card h3{margin:6px 0 10px;font-size:15px}.contact-lines{display:grid;gap:5px}.contact-lines a,.contact-lines span{color:#315b74;font-size:12px;overflow-wrap:anywhere}.toc{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.toc a,.original{display:inline-flex;align-items:center;border-radius:999px;padding:8px 12px;text-decoration:none;font-size:12px;font-weight:750}.toc a{background:#e7f8f2;color:#075e52}.original{background:#fff;border:1px solid #bfe9db;color:#075e52}.sheet{margin-top:18px;background:#fff;border:1px solid #e3e9f1;border-radius:18px;overflow:hidden;box-shadow:0 12px 28px -26px rgba(15,35,67,.6)}.sheet-header{display:flex;gap:16px;align-items:start;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e9eef4}.sheet-header .eyebrow{color:#087365}.sheet-header h2{margin:5px 0 0;font-size:18px}.sheet-meta{margin:2px 0 0;color:#62748b;font-size:12px;white-space:nowrap}.table-wrap{overflow:auto;max-height:72vh}table{border-collapse:collapse;min-width:100%;font-size:12px;line-height:1.45}th,td{border-right:1px solid #edf1f5;border-bottom:1px solid #edf1f5;padding:9px 11px;text-align:left;vertical-align:top;white-space:pre-wrap}th{position:sticky;left:0;background:#f8fafc;color:#64748b;font-size:10px;font-weight:800;text-align:right;z-index:1}td{min-width:110px}.empty{padding:24px;color:#62748b;text-align:center}@media(max-width:640px){.page{padding:18px 12px 32px}.hero{border-radius:18px;padding:22px}.meta{grid-template-columns:1fr}.contacts{padding:16px}.sheet-header{padding:16px}.sheet-meta{white-space:normal;text-align:right}th,td{padding:8px 10px;font-size:11px}}@media print{body{background:#fff}.page{max-width:none;padding:0}.hero{box-shadow:none;border-radius:0}.sheet{box-shadow:none;break-inside:avoid}.table-wrap{max-height:none;overflow:visible}}</style></head><body><main class="page"><section class="hero"><p class="eyebrow">${sourceName} workbook data</p><h1>${escapeHtml(input.reportName)}</h1><p>Request #${input.requestId} · ${escapeHtml(propertyLabel)} · Rendered from the preserved original workbook.</p></section><section class="meta"><div class="meta-card"><span>Workbook</span><strong>${escapeHtml(input.originalFilename)}</strong></div><div class="meta-card"><span>Worksheets</span><strong>${sheets.length}</strong></div><div class="meta-card"><span>Properties</span><strong>${escapeHtml(propertyLabel)}</strong></div></section>${renderContacts(input.contactMatches ?? [])}<a class="original" href="${escapeHtml(input.originalFileUrl)}" target="_blank" rel="noreferrer">Open preserved original workbook</a><nav class="toc" aria-label="Worksheets">${sheets.map(sheet => `<a href="#${sheet.anchor}">${escapeHtml(sheet.name)} · ${sheet.rowCount} rows</a>`).join("")}</nav>${sheets.map(sheet => sheet.html).join("")}</main></body></html>`;
}
