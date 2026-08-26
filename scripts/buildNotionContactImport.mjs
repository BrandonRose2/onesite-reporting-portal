import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const source = "/home/ubuntu/.mcp/tool-results/2026-08-26_20-56-57.202045192_notion_notion-query-data-sources_65f054ce.json";
const destination = "/tmp/notion_manager_contacts.sql";
const data = JSON.parse(readFileSync(source, "utf8"));
const escapeSql = value => String(value).replaceAll("'", "''");
const normalize = value => value.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\b(apts?|apartments|office|townhomes?)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const rows = data.results.map((row, index) => {
  const propertyName = typeof row.Property === "string" && row.Property.trim() ? row.Property.trim() : null;
  const managerName = typeof row.Manager === "string" && row.Manager.trim() ? row.Manager.trim() : null;
  const email = typeof row["Email Address"] === "string" && row["Email Address"].includes("@") ? row["Email Address"].trim() : null;
  const region = typeof row.Region === "string" && row.Region.trim() ? row.Region.trim() : null;
  const isRegionalManager = row["Regional Manager"] === "__YES__";
  const contactKey = createHash("sha256").update(`${propertyName ?? "regional"}|${managerName ?? "unassigned"}|${email ?? "no-email"}|${region ?? "no-region"}|${index}`).digest("hex").slice(0, 64);
  const values = [contactKey, propertyName, propertyName ? normalize(propertyName) : null, managerName, email, region, isRegionalManager ? 1 : 0, "notion_company_contacts"];
  return `(${values.map(value => value === null ? "NULL" : typeof value === "number" ? String(value) : `'${escapeSql(value)}'`).join(", ")})`;
});

writeFileSync(destination, `INSERT INTO managerContacts (contactKey, propertyName, normalizedPropertyName, managerName, email, region, isRegionalManager, source) VALUES\n${rows.join(",\n")}\nON DUPLICATE KEY UPDATE propertyName=VALUES(propertyName), normalizedPropertyName=VALUES(normalizedPropertyName), managerName=VALUES(managerName), email=VALUES(email), region=VALUES(region), isRegionalManager=VALUES(isRegionalManager), syncedAt=NOW();\n`);
console.log(`Prepared ${rows.length} approved Notion contact records at ${destination}`);
