import { readFile } from "node:fs/promises";
import { normalizeNotionContactRows } from "../server/contactMatching";
import { upsertManagerContacts } from "../server/db";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: pnpm exec tsx scripts/importNotionManagerContacts.mjs <notion-result.json>");

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const contacts = normalizeNotionContactRows(Array.isArray(source.results) ? source.results : []);
await upsertManagerContacts(contacts);
console.log(JSON.stringify({ imported: contacts.length, source: "notion_company_contacts" }));
