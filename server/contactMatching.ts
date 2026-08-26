export type NotionContactRow = {
  Property?: string | null;
  Manager?: string | null;
  "Email Address"?: string | null;
  Region?: string | null;
  "Regional Manager"?: string | null;
};

export type ManagerContactInput = {
  contactKey: string;
  propertyName: string | null;
  normalizedPropertyName: string | null;
  managerName: string | null;
  email: string | null;
  region: string | null;
  isRegionalManager: boolean;
};

export function normalizePropertyName(value: string) {
  return value.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\b(apts?|apartments|office|townhomes?)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeNotionContactRows(rows: NotionContactRow[]): ManagerContactInput[] {
  return rows.map((row, index) => {
    const propertyName = typeof row.Property === "string" && row.Property.trim() ? row.Property.trim() : null;
    const managerName = typeof row.Manager === "string" && row.Manager.trim() ? row.Manager.trim() : null;
    const email = typeof row["Email Address"] === "string" && row["Email Address"].includes("@") ? row["Email Address"].trim() : null;
    const region = typeof row.Region === "string" && row.Region.trim() ? row.Region.trim() : null;
    const isRegionalManager = row["Regional Manager"] === "__YES__";
    const keyBase = `${propertyName ?? "regional"}:${managerName ?? "unassigned"}:${email ?? "no-email"}:${region ?? "no-region"}:${index}`;
    return {
      contactKey: Buffer.from(keyBase).toString("base64url").slice(0, 96),
      propertyName,
      normalizedPropertyName: propertyName ? normalizePropertyName(propertyName) : null,
      managerName,
      email,
      region,
      isRegionalManager,
    };
  }).filter(contact => contact.propertyName || contact.isRegionalManager || contact.email || contact.managerName);
}

export function matchManagerContacts(propertyName: string, contacts: Array<{ propertyName: string | null; normalizedPropertyName: string | null; managerName: string | null; email: string | null; region: string | null; isRegionalManager: boolean }>) {
  const normalized = normalizePropertyName(propertyName);
  const propertyContacts = contacts.filter(contact => contact.normalizedPropertyName === normalized || (contact.propertyName ? normalizePropertyName(contact.propertyName) === normalized : false));
  const region = propertyContacts.find(contact => contact.region)?.region ?? null;
  const regionalContacts = region ? contacts.filter(contact => contact.region === region && contact.isRegionalManager) : [];
  return { propertyContacts, regionalContacts, matchedRegion: region };
}
