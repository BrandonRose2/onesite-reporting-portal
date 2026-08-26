import { describe, expect, it } from "vitest";
import { matchManagerContacts, normalizeNotionContactRows } from "./contactMatching";

describe("Notion manager contact matching", () => {
  const contacts = normalizeNotionContactRows([
    { Property: "North Pointe Apts", Manager: "Property Lead", "Email Address": "lead@example.com", Region: "Region 3", "Regional Manager": "__NO__" },
    { Property: null, Manager: "Regional Lead", "Email Address": "regional@example.com", Region: "Region 3", "Regional Manager": "__YES__" },
  ]);

  it("matches property and regional recipients using approved Notion fields", () => {
    const match = matchManagerContacts("North Pointe", contacts);
    expect(match.propertyContacts[0]).toMatchObject({ managerName: "Property Lead", email: "lead@example.com" });
    expect(match.regionalContacts[0]).toMatchObject({ managerName: "Regional Lead", email: "regional@example.com" });
  });

  it("returns an explicit empty match when the property is not represented", () => {
    expect(matchManagerContacts("Unknown Property", contacts)).toMatchObject({ propertyContacts: [], regionalContacts: [], matchedRegion: null });
  });
});
