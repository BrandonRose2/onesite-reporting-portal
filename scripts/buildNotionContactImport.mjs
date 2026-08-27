import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const source = "/home/ubuntu/.mcp/tool-results/2026-08-27_18-15-03.865887821_notion_notion-query-data-sources_6e16b1f3.json";
const destination = "/tmp/notion_manager_contacts.sql";
const data = JSON.parse(readFileSync(source, "utf8"));
const escapeSql = value => String(value).replaceAll("'", "''");
const normalize = value => value.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\b(apts?|apartments|office|townhomes?)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const rows = data.results.map((row, index) => {
  const propertyName = typeof row.Property === "string" && row.Property.trim() ? row.Property.trim() : null;
  const recordName = typeof row.Record === "string" && row.Record.trim() ? row.Record.trim() : null;
  const isRegionalManager = row["Regional Manager"] === "__YES__";
  const managerName = typeof row.Manager === "string" && row.Manager.trim() ? row.Manager.trim() : null;
  const email = typeof row["Email Address"] === "string" && row["Email Address"].includes("@") ? row["Email Address"].trim() : null;
  const cleanPhone = value => typeof value === "string" && value.trim() && !/^[-\s]+$/.test(value) && !/see above/i.test(value) ? value.trim() : null;
  const officePhone = cleanPhone(row.Office);
  const mobilePhone = cleanPhone(row.Mobile);
  const phoneExtension = typeof row.Ext === "string" && row.Ext.trim() ? row.Ext.trim() : null;
  const region = typeof row.Region === "string" && row.Region.trim() ? row.Region.trim() : null;
  const contactKey = createHash("sha256").update(`${propertyName ?? "regional"}|${managerName ?? "unassigned"}|${email ?? "no-email"}|${region ?? "no-region"}|${index}`).digest("hex").slice(0, 64);
  const values = [contactKey, propertyName, propertyName ? normalize(propertyName) : null, managerName, recordName, email, officePhone, mobilePhone, phoneExtension, region, isRegionalManager ? 1 : 0, "notion_company_contacts"];
  return `(${values.map(value => value === null ? "NULL" : typeof value === "number" ? String(value) : `'${escapeSql(value)}'`).join(", ")})`;
});

writeFileSync(destination, `INSERT INTO managerContacts (contactKey, propertyName, normalizedPropertyName, managerName, recordName, email, officePhone, mobilePhone, phoneExtension, region, isRegionalManager, source) VALUES\n${rows.join(",\n")}\nON DUPLICATE KEY UPDATE propertyName=VALUES(propertyName), normalizedPropertyName=VALUES(normalizedPropertyName), managerName=VALUES(managerName), recordName=VALUES(recordName), email=VALUES(email), officePhone=VALUES(officePhone), mobilePhone=VALUES(mobilePhone), phoneExtension=VALUES(phoneExtension), region=VALUES(region), isRegionalManager=VALUES(isRegionalManager), syncedAt=NOW();\n`);
console.log(`Prepared ${rows.length} approved Notion contact records at ${destination}`);
